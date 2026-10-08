"""Cookie-based JWT authentication.

Tokens are delivered via httpOnly cookies (SameSite=Lax) for browser SPA
security, with Bearer header fallback for API clients and testing.

Refs: API Spec doc 07 §6, Security doc 08 §7.
"""
from django.conf import settings
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication as BaseJWTAuth
from rest_framework_simplejwt.tokens import RefreshToken


def set_jwt_cookies(response, refresh_token_obj):
    """Set httpOnly cookies for access and refresh tokens on a DRF Response."""
    access_token = str(refresh_token_obj.access_token)
    refresh_token = str(refresh_token_obj)

    response.set_cookie(
        settings.COOKIE_NAME_ACCESS,
        access_token,
        max_age=settings.COOKIE_MAX_AGE_ACCESS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/api/",
    )
    response.set_cookie(
        settings.COOKIE_NAME_REFRESH,
        refresh_token,
        max_age=settings.COOKIE_MAX_AGE_REFRESH,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/api/v1/auth/",
    )
    return response


def clear_jwt_cookies(response):
    """Remove JWT cookies on logout."""
    response.delete_cookie(settings.COOKIE_NAME_ACCESS, path="/api/")
    response.delete_cookie(settings.COOKIE_NAME_REFRESH, path="/api/v1/auth/")
    return response


def get_token_pair_for_user(user):
    """Return a RefreshToken (which includes .access_token) for the given user."""
    return RefreshToken.for_user(user)


class CookieJWTAuthentication(BaseJWTAuth):
    """Read JWT from Authorization header first, then from httpOnly cookie."""

    def authenticate(self, request: Request):
        auth = super().authenticate(request)
        if auth is not None:
            return auth

        cookie_name = settings.COOKIE_NAME_ACCESS
        token = request.COOKIES.get(cookie_name)
        if not token:
            return None

        validated = self.get_validated_token(token)
        return self.get_user(validated), validated
