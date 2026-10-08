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

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academics.models import Department
from apps.audit.services import audit

from .models import StudentProfile, User

TEMP_PASSWORD_LENGTH = 8


def generate_temp_password():
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(TEMP_PASSWORD_LENGTH))


class RosterUploadView(APIView):
    """POST /api/v1/admin/roster/upload/  (multipart CSV)

    Expected CSV header: matricule,first_name,last_name,email,level,department_code
    Re-uploading the same student updates their profile (idempotent) and
    never regenerates an existing password.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
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

                if User.objects.filter(email__iexact=email).exists():
                    user = User.objects.filter(email__iexact=email).first()
                    profile = getattr(user, "student_profile", None)
                    if profile:
                        profile.student_number = profile.student_number or matricule
                        profile.level = level or profile.level
                        if department:
                            profile.department = department
                        profile.save(update_fields=["student_number", "level", "department", "updated_at"])
                    if dob and not user.date_of_birth:
                        user.date_of_birth = dob
                        user.save(update_fields=["date_of_birth", "updated_at"])
                    updated_rows.append({"email": email, "matricule": matricule})
                    continue

                if StudentProfile.objects.filter(student_number=matricule).exists():
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
