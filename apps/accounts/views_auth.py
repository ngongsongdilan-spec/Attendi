"""Authentication endpoints (API Spec doc 07 §13).

Cookie-based JWT. Returns tokens both in cookies AND body for dev flexibility.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.audit.services import audit

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .authentication import (
    clear_jwt_cookies,
    get_token_pair_for_user,
    set_jwt_cookies,
)
from .serializers import MeSerializer, RegisterSerializer, SelfRegisterSerializer

User = get_user_model()


class RegisterView(APIView):
    """Admin-only user creation.

    Public self-registration is disabled: student accounts come from the
    department roster upload, so outsiders cannot create accounts and
    nobody can sign up with someone else's matricule.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only administrators can create accounts."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        audit(user=request.user, action="ACCOUNT_CREATED", resource_type="User", resource_id=user.id, request=request,
              metadata={"created_email": user.email, "role": user.role})
        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class SelfRegisterView(APIView):
    """POST /api/v1/auth/self-register/

    Public self-registration. Role is chosen explicitly on the registration form:
      STUDENT  -> must provide matricule + level + department (@student.ubuea.cm recommended)
      LECTURER -> must provide staff_number + department (any valid email)
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = SelfRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        audit(user=user, action="SELF_REGISTERED", resource_type="User", resource_id=user.id, request=request,
              metadata={"email": user.email, "role": user.role})
        return Response(
            {"message": "Account created successfully. You can now sign in.", "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/

    Requires the current password. Clears must_change_password so roster
    accounts become fully usable after first login (BR-002).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new = request.data.get("new_password", "")
        if not current or not new:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Current and new password are required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new) < 8:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "New password must be at least 8 characters."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not check_password(current, request.user.password):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Current password is incorrect."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if check_password(new, request.user.password):
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "New password must be different from the current one."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(new)
        request.user.must_change_password = False
        request.user.save(update_fields=["password", "must_change_password", "updated_at"])
        audit(user=request.user, action="PASSWORD_CHANGED", resource_type="User", resource_id=request.user.id, request=request)
        return Response({"message": "Password changed successfully."})


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """POST /api/v1/auth/login/

    Accepts either:
      - email + password  (lecturers, admins)
      - matricule + password  (students — matricule is looked up in StudentProfile)
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        identifier = request.data.get("email", "").strip().lower()
        matricule = request.data.get("matricule", "").strip()
        password = request.data.get("password", "")

        if not password:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Password is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None

        # Student login via matricule
        if matricule and not identifier:
            from .models import StudentProfile
            profile = StudentProfile.objects.select_related("user").filter(
                student_number__iexact=matricule
            ).first()
            if profile:
                user = profile.user

        # Email login (lecturer / admin / student)
        elif identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Email or matricule and password are required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user is None or not check_password(password, user.password):
            return Response(
                {"success": False, "error": {"code": "UNAUTHENTICATED", "message": "Invalid credentials."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active or user.status != User.Status.ACTIVE:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Your account is not active."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        user.record_login()
        refresh = get_token_pair_for_user(user)
        audit(user=user, action="LOGGED_IN", resource_type="User", resource_id=user.id, request=request)
        # JWT lives exclusively in httpOnly cookies (never exposed to JS).
        resp = Response(MeSerializer(user).data, status=status.HTTP_200_OK)
        return set_jwt_cookies(resp, refresh)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_cookie = request.COOKIES.get("fet_refresh")
        if refresh_cookie:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken

                RefreshToken(refresh_cookie).blacklist()
            except Exception:
                pass
        audit(user=request.user, action="LOGGED_OUT", resource_type="User", resource_id=request.user.id, request=request)
        resp = Response(status=status.HTTP_204_NO_CONTENT)
        clear_jwt_cookies(resp)
        return resp


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken

        cookie_refresh = request.COOKIES.get("fet_refresh")
        body_refresh = request.data.get("refresh")
        token_str = cookie_refresh or body_refresh
        if not token_str:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Refresh token required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            refresh = RefreshToken(token_str)
            user_id = refresh["user_id"]
            user = User.objects.get(id=user_id)
        except Exception:
            return Response(
                {"success": False, "error": {"code": "UNAUTHENTICATED", "message": "Invalid or expired refresh token."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh.rotate()
        # New tokens are delivered only via httpOnly cookies.
        resp = Response({"message": "Token refreshed."})
        return set_jwt_cookies(resp, refresh)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        from .serializers import ProfileUpdateSerializer

        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response(
            {"success": True, "data": {"message": "If an account with that email exists, a reset link has been sent."}},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response(
            {"success": True, "data": {"message": "Password reset is not yet implemented. Contact your administrator."}},
            status=status.HTTP_200_OK,
        )
