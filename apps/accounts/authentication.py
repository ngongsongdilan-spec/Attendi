"""Cookie-based JWT authentication.

Tokens are delivered via httpOnly cookies (SameSite=Lax) for browser SPA
security, with Bearer header fallback for API clients and testing.

Refs: API Spec doc 07 §6, Security doc 08 §7.
"""
import http.cookies

from django.conf import settings
from django.utils.crypto import get_random_string
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication as BaseJWTAuth
from rest_framework_simplejwt.tokens import RefreshToken

# CHIPS (`Partitioned`) support is a *Python* Morsel feature (3.14+). Django's
# set_cookie() exposes no `partitioned` kwarg even on 6.0, so passing one is
# silently dropped. Feature-detect once at import and set the flag on the
# Morsel Django already stores, which serialises correctly either way.
_MORSE_SUPPORTS_PARTITIONED = "partitioned" in http.cookies.Morsel()._reserved


def _apply_partitioned(response, *names):
    """Tag cookies as Partitioned (CHIPS) when the browser needs it.

    Partitioned only matters for cross-site auth (``COOKIE_SAMESITE=None``) --
    the one case where third-party cookies are acceptable at all. In the
    supported same-site layout this is a no-op.

    Cost: O(len(names)) on login/refresh/logout responses only, never on
    ordinary API calls, so there is no per-request overhead.
    """
    if not settings.COOKIE_PARTITIONED or not _MORSE_SUPPORTS_PARTITIONED:
        return response
    for name in names:
        morsel = response.cookies.get(name)
        if morsel is not None and not morsel.get("partitioned"):
            morsel["partitioned"] = True
    return response


def set_jwt_cookie_values(response, access_token, refresh_token):
    """Write the access/refresh cookies from already-stringified tokens.

    Separated from :func:`set_jwt_cookies` so the refresh endpoint can consume
    SimpleJWT's own rotation output directly, instead of re-deriving a token
    object via a hand-rolled rotation that raised AttributeError (HTTP 500).
    """
    shared = dict(
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )

    response.set_cookie(
        settings.COOKIE_NAME_ACCESS,
        access_token,
        max_age=settings.COOKIE_MAX_AGE_ACCESS,
        path="/api/",
        **shared,
    )
    response.set_cookie(
        settings.COOKIE_NAME_REFRESH,
        refresh_token,
        max_age=settings.COOKIE_MAX_AGE_REFRESH,
        path="/api/v1/auth/",
        **shared,
    )
    ensure_csrf_cookie(response)
    return _apply_partitioned(
        response, settings.COOKIE_NAME_ACCESS, settings.COOKIE_NAME_REFRESH,
        settings.CSRF_COOKIE_NAME,
    )


def set_jwt_cookies(response, refresh_token_obj):
    """Set httpOnly cookies for access and refresh tokens on a DRF Response."""
    return set_jwt_cookie_values(
        response,
        str(refresh_token_obj.access_token),
        str(refresh_token_obj),
    )


def ensure_csrf_cookie(response):
    """Make sure the SPA can read a CSRF cookie to echo back on writes.

    The JS client sends the ``csrftoken`` cookie as an ``X-CSRFToken`` header
    (see frontend ``src/lib/api.js``). Reading it is safe: it is not a secret,
    it only needs to be unguessable and paired with the session.

    Auth runs on JWT cookies rather than Django sessions, so ``get_token()``
    (which needs a request with CSRF middleware state) is not applicable here.
    A random value is exactly what Django's own CSRF middleware would store.
    """
    if not response.cookies.get(settings.CSRF_COOKIE_NAME):
        response.set_cookie(
            settings.CSRF_COOKIE_NAME,
            get_random_string(32),
            max_age=settings.CSRF_COOKIE_AGE,
            httponly=False,  # must be readable by JS to build the header
            secure=settings.CSRF_COOKIE_SECURE,
            samesite=settings.CSRF_COOKIE_SAMESITE,
            domain=settings.COOKIE_DOMAIN,
            path="/",
        )
    return response


def clear_jwt_cookies(response):
    """Remove JWT cookies on logout."""
    response.delete_cookie(
        settings.COOKIE_NAME_ACCESS, path="/api/", domain=settings.COOKIE_DOMAIN
    )
    response.delete_cookie(
        settings.COOKIE_NAME_REFRESH, path="/api/v1/auth/", domain=settings.COOKIE_DOMAIN
    )
    return _apply_partitioned(response, settings.COOKIE_NAME_ACCESS, settings.COOKIE_NAME_REFRESH)


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
