"""Roster-based account provisioning (BR-002, BR-003).

Departments upload the official student list per level as CSV.
Accounts are created with a one-time temporary password that must be
changed at first login. Public self-registration is disabled, so only
rostered students get accounts - outsiders cannot sign up and nobody
can register using another student's matricule.
"""
import csv
import io
import secrets
import string

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academics.models import Department
from apps.audit.services import audit
from apps.core.scoping import can_administer_department, is_admin

from .models import StudentProfile, User
from .serializers import AdminAccountCreateSerializer, AdminAssignmentSerializer, MeSerializer

TEMP_PASSWORD_LENGTH = 8


def generate_temp_password():
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(TEMP_PASSWORD_LENGTH))


class AdminAccountListView(APIView):
    """System-admin-only creation and listing of scoped admin accounts."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.SYSTEM_ADMIN:
            return Response(status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(role__in=[
            User.Role.SYSTEM_ADMIN, User.Role.FACULTY_ADMIN, User.Role.DEPARTMENT_ADMIN,
        ]).select_related("admin_faculty", "admin_department__faculty").order_by("email")
        return Response(MeSerializer(users, many=True).data)

    def post(self, request):
        if request.user.role != User.Role.SYSTEM_ADMIN:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = AdminAccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        temporary_password = secrets.token_urlsafe(18)
        user = User.objects.create_user(
            email=values["email"], password=temporary_password,
            first_name=values["first_name"], last_name=values["last_name"],
            role=values["role"], admin_faculty=values.get("admin_faculty"),
            admin_department=values.get("admin_department"), must_change_password=True,
        )
        audit(user=request.user, action="ADMIN_ACCOUNT_CREATED", resource_type="User",
              resource_id=user.id, request=request, metadata={"role": user.role})
        return Response({"user": MeSerializer(user).data, "temporary_password": temporary_password},
                        status=status.HTTP_201_CREATED)


class AdminAccountAssignView(APIView):
    """Promote an existing account or change an admin's academic scope."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        if request.user.role != User.Role.SYSTEM_ADMIN:
            return Response(status=status.HTTP_403_FORBIDDEN)
        from django.shortcuts import get_object_or_404

        user = get_object_or_404(User, id=user_id)
        if user.role == User.Role.SYSTEM_ADMIN:
            return Response({"error": "System admin accounts cannot be reassigned here."},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = AdminAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        old_role = user.role
        user.role = values["role"]
        user.admin_faculty = values.get("admin_faculty")
        user.admin_department = values.get("admin_department")
        user.full_clean()
        user.save(update_fields=["role", "admin_faculty", "admin_department", "updated_at"])
        audit(user=request.user, action="ADMIN_SCOPE_ASSIGNED", resource_type="User",
              resource_id=user.id, request=request,
              metadata={"old_role": old_role, "new_role": user.role})
        return Response(MeSerializer(user).data)


class RosterUploadView(APIView):
    """POST /api/v1/admin/roster/upload/  (multipart CSV)

    Expected CSV header: matricule,first_name,last_name,email,level,department_code
    Re-uploading the same student updates their profile (idempotent) and
    never regenerates an existing password.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not is_admin(request.user):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only administrators can upload rosters."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        file = request.FILES.get("file")
        if file is None:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Attach a CSV file in the 'file' field."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > settings.FILE_MAX_SIZE_BYTES:
            return Response({"error": "Roster file exceeds the upload size limit."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            text = file.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text))
            required = {"matricule", "first_name", "last_name", "email", "level", "department_code"}
            header = {h.strip().lower() for h in (reader.fieldnames or [])}
            if not required.issubset(header):
                return Response(
                    {"success": False, "error": {"code": "VALIDATION_ERROR",
                     "message": f"CSV must contain columns: {', '.join(sorted(required))}"}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (UnicodeDecodeError, csv.Error):
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Could not read file as CSV."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created, updated_rows, errors = [], [], []
        with transaction.atomic():
            for i, row in enumerate(reader, start=2):  # line 1 is the header
                matricule = (row.get("matricule") or "").strip()
                email = (row.get("email") or "").strip().lower()
                first_name = (row.get("first_name") or "").strip()
                last_name = (row.get("last_name") or "").strip()
                level = (row.get("level") or "").strip()
                dept_code = (row.get("department_code") or "").strip().upper()
                dob_raw = (row.get("date_of_birth") or row.get("dob") or "").strip()
                dob = None
                if dob_raw:
                    from datetime import date as _date, datetime as _datetime
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
                        try:
                            dob = _datetime.strptime(dob_raw, fmt).date()
                            break
                        except ValueError:
                            continue
                    if dob is None:
                        errors.append({"line": i, "matricule": matricule, "error": f"Unreadable date_of_birth '{dob_raw}' (use YYYY-MM-DD)."})
                        continue

                if not all([matricule, email, first_name, last_name]):
                    errors.append({"line": i, "error": "Missing required value."})
                    continue

                department = Department.objects.filter(code__iexact=dept_code).first() if dept_code else None
                if dept_code and department is None:
                    errors.append({"line": i, "matricule": matricule, "error": f"Unknown department code '{dept_code}'."})
                    continue
                if not can_administer_department(request.user, department):
                    errors.append({"line": i, "matricule": matricule, "error": "Department is outside your admin scope."})
                    continue

                if User.objects.filter(email__iexact=email).exists():
                    user = User.objects.filter(email__iexact=email).first()
                    profile = getattr(user, "student_profile", None)
                    if user.role != User.Role.STUDENT or profile is None or not can_administer_department(request.user, profile.department):
                        errors.append({"line": i, "matricule": matricule, "error": "Existing account is outside your roster scope."})
                        continue
                    if not profile.student_number:
                        if StudentProfile.objects.filter(student_number__iexact=matricule).exists():
                            errors.append({"line": i, "matricule": matricule, "error": "Matricule already belongs to another account."})
                            continue
                        profile.student_number = matricule
                    profile.level = level or profile.level
                    if department:
                        profile.department = department
                    profile.save(update_fields=["student_number", "level", "department", "updated_at"])
                    if dob and not user.date_of_birth:
                        user.date_of_birth = dob
                        user.save(update_fields=["date_of_birth", "updated_at"])
                    updated_rows.append({"email": email, "matricule": matricule})
                    continue

                if StudentProfile.objects.filter(student_number__iexact=matricule).exists():
                    errors.append({"line": i, "matricule": matricule, "error": "Matricule already belongs to another account."})
                    continue

                temp_password = generate_temp_password()
                user = User.objects.create_user(
                    email=email, password=temp_password,
                    first_name=first_name, last_name=last_name,
                    role=User.Role.STUDENT, must_change_password=True,
                    date_of_birth=dob,
                )
                StudentProfile.objects.create(
                    user=user, student_number=matricule,
                    department=department, level=level,
                    admission_year=secrets.randbelow(6) + 2020,
                )
                created.append({"email": email, "matricule": matricule, "full_name": user.get_full_name(), "temp_password": temp_password})

        audit(user=request.user, action="ROSTER_UPLOADED", resource_type="User", request=request,
              metadata={"created": len(created), "updated": len(updated_rows), "errors": len(errors)})

        return Response({
            "created_count": len(created),
            "updated_count": len(updated_rows),
            "error_count": len(errors),
            "created": created,
            "updated": updated_rows,
            "errors": errors,
        }, status=status.HTTP_201_CREATED)
