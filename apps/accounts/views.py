from django.contrib import auth
from django.http import JsonResponse
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.academic_access import is_admin_user

from .models import User
from .serializers import (
    ChangeRoleSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services.auth_service import (
    AuthError,
    DuplicateAccountError,
    InvalidRoleError,
    SelfRoleAssignmentError,
    UnauthorizedRoleChangeError,
    register_account,
    change_user_role,
)


def _error_response(message, code, http_status=status.HTTP_400_BAD_REQUEST):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=http_status,
    )


def _success_response(data, http_status=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=http_status)


def csrf_token_view(request):
    """Return the CSRF token. The token is also set as a cookie by Django's CsrfViewMiddleware."""
    token = get_token(request)
    return JsonResponse({"success": True, "data": {"csrfToken": token}})


class RegisterView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            account = register_account(
                email=data["email"],
                username=data["username"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                password=data["password"],
                AccountModel=User,
            )
        except DuplicateAccountError as exc:
            return _error_response(
                str(exc), "DUPLICATE_ACCOUNT", status.HTTP_409_CONFLICT,
            )
        except AuthError as exc:
            return _error_response(str(exc), "INVALID_DATA", status.HTTP_400_BAD_REQUEST)

        return _success_response(
            UserSerializer(account).data,
            status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = auth.authenticate(
            request,
            email=data["email"],
            password=data["password"],
        )
        if user is None:
            return _error_response(
                "Invalid email or password.",
                "INVALID_CREDENTIALS",
                status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return _error_response(
                "This account has been disabled.",
                "ACCOUNT_DISABLED",
                status.HTTP_403_FORBIDDEN,
            )

        auth.login(request, user)
        return _success_response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        auth.logout(request)
        return _success_response({"message": "Logged out successfully."})


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return _success_response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return _success_response(serializer.data)


class ChangeRoleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not is_admin_user(request.user):
            return _error_response(
                "Only administrators may change user roles.",
                "UNAUTHORIZED_ROLE_CHANGE",
                status.HTTP_403_FORBIDDEN,
            )

        serializer = ChangeRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            target_user = User.objects.get(id=data["user_id"])
        except User.DoesNotExist:
            return _error_response(
                "User not found.",
                "USER_NOT_FOUND",
                status.HTTP_404_NOT_FOUND,
            )

        try:
            change_user_role(
                target_user,
                data["new_role"],
                actor=request.user,
            )
        except SelfRoleAssignmentError as exc:
            return _error_response(
                str(exc), "SELF_ROLE_ASSIGNMENT", status.HTTP_403_FORBIDDEN
            )
        except UnauthorizedRoleChangeError as exc:
            return _error_response(
                str(exc), "UNAUTHORIZED_ROLE_CHANGE", status.HTTP_403_FORBIDDEN
            )
        except InvalidRoleError as exc:
            return _error_response(
                str(exc), "INVALID_ROLE", status.HTTP_400_BAD_REQUEST
            )

        return _success_response(UserSerializer(target_user).data)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin_user(request.user):
            return _error_response(
                "Only administrators may list users.",
                "UNAUTHORIZED",
                status.HTTP_403_FORBIDDEN,
            )

        users = User.objects.all()
        return _success_response(UserSerializer(users, many=True).data)
