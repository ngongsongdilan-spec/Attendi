"""User management endpoints (API Spec doc 07 §14)."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdmin
from apps.audit.services import audit
from apps.core.scoping import can_view_user, scope_users

from .models import StudentProfile, User
from .serializers import MeSerializer, UserPublicSerializer


class MyCoursesView(APIView):
    """GET /api/v1/users/me/courses - delegated to academics.urls"""
    pass


class UserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        role = request.query_params.get("role")
        qs = scope_users(User.objects.select_related("student_profile", "lecturer_profile"), request.user)
        if role:
            qs = qs.filter(role=role.upper())
        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(email__icontains=search)
        qs = qs.order_by("email")[:50]
        return Response(UserPublicSerializer(qs, many=True).data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from django.shortcuts import get_object_or_404

        user = get_object_or_404(User, id=user_id)
        if request.user.role in {User.Role.FACULTY_ADMIN, User.Role.DEPARTMENT_ADMIN} and not can_view_user(request.user, user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        if request.user.id != user.id and request.user.role not in {
            "DEPARTMENT_ADMIN", "FACULTY_ADMIN", "SYSTEM_ADMIN", "LECTURER"
        }:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You cannot view this profile."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(MeSerializer(user).data)

    def patch(self, request, user_id):
        from django.shortcuts import get_object_or_404

        user = get_object_or_404(User, id=user_id)
        if "role" in request.data:
            return Response({"error": "Use the admin account assignment endpoint to change roles."},
                            status=status.HTTP_400_BAD_REQUEST)
        is_system_admin = request.user.role == User.Role.SYSTEM_ADMIN
        if request.user.id != user.id and not is_system_admin:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You cannot update this user."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Account status is administrative state: a user must not be able to
        # suspend or archive their own account, so only a system admin may
        # change it - including on their own account.
        if "status" in request.data and not is_system_admin:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only a system admin can change account status."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if "status" in request.data and request.data["status"] not in User.Status.values:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid status value."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for field in ("first_name", "last_name", "status"):
            if field in request.data:
                old_val = getattr(user, field)
                new_val = request.data[field]
                if old_val != new_val:
                    setattr(user, field, new_val)
                    audit(
                        user=request.user, action=f"USER_{field.upper()}_CHANGED",
                        resource_type="User", resource_id=user.id,
                        request=request, metadata={"old": str(old_val), "new": str(new_val)},
                    )
        user.save()
        return Response(MeSerializer(user).data)
