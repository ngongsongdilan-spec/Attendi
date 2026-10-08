"""User management endpoints (API Spec doc 07 §14)."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdmin
from apps.audit.services import audit

from .models import StudentProfile, User
from .serializers import MeSerializer, StudentListSerializer


class MyCoursesView(APIView):
    """GET /api/v1/users/me/courses - delegated to academics.urls"""
    pass


class UserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        role = request.query_params.get("role")
        qs = User.objects.select_related("student_profile", "lecturer_profile").all()
        if role:
            qs = qs.filter(role=role.upper())
        return Response(StudentListSerializer(qs, many=True).data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from django.shortcuts import get_object_or_404

        user = get_object_or_404(User, id=user_id)
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
        if request.user.id != user.id and request.user.role not in {
            "SYSTEM_ADMIN"
        }:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You cannot update this user."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        for field in ("first_name", "last_name", "status", "role"):
            if field in request.data:
                if field == "role" and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN"}:
                    continue
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
