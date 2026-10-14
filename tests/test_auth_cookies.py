"""Cookie attribute contracts for browser auth.

These guard the iOS Safari sign-in regression: when the JWT cookies are sent
as *third-party* cookies, Safari (ITP) discards them even though login returns
200, and the SPA bounces the user back to the login page. The defences are
(a) same-site cookies and (b) CHIPS when cross-site is unavoidable.

Refs: frontend ``vercel.json`` rewrite, settings COOKIE_SAMESITE/PARTITIONED.
"""
import pytest
from django.test import Client
from django.urls import reverse

from apps.accounts.models import User


def _login(client, email="cookies@test.edu"):
    return client.post(
        reverse("auth-login"),
        {"email": email, "password": "pass1234"},
        content_type="application/json",
    )


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="cookies@test.edu", password="pass1234", first_name="Co", last_name="okie"
    )


@pytest.mark.django_db
class TestAuthCookieAttributes:
    def test_jwt_cookies_are_samesite_lax_by_default(self, user):
        """Lax keeps the cookies first-party; SameSite=None makes them third-party."""
        from django.conf import settings

        from rest_framework.test import APIClient

        client = APIClient()
        resp = _login(client)

        assert resp.status_code == 200
        assert resp.cookies[settings.COOKIE_NAME_ACCESS]["samesite"] == "Lax"
        assert resp.cookies[settings.COOKIE_NAME_REFRESH]["samesite"] == "Lax"

    def test_same_site_cookies_are_not_partitioned(self, user):
        """Partitioned is only legal/meaningful for SameSite=None (CHIPS)."""
        from django.conf import settings

        from rest_framework.test import APIClient

        client = APIClient()
        resp = _login(client)

        # A same-site deployment must not carry the CHIPS flag.
        assert not settings.COOKIE_PARTITIONED
        # Morsel exposes flag attributes as '' rather than False.
        assert not resp.cookies[settings.COOKIE_NAME_ACCESS]["partitioned"]

    def test_cookie_paths_are_scoped(self, user):
        """Access cookie is API-wide; refresh cookie stays on the auth endpoints."""
        from django.conf import settings

        from rest_framework.test import APIClient

        client = APIClient()
        resp = _login(client)

        assert resp.cookies[settings.COOKIE_NAME_ACCESS]["path"] == "/api/"
        assert resp.cookies[settings.COOKIE_NAME_REFRESH]["path"] == "/api/v1/auth/"

    def test_login_sets_readable_csrf_cookie(self, user):
        """The SPA must be able to read csrftoken to build the X-CSRFToken header."""
        from django.conf import settings

        from rest_framework.test import APIClient

        client = APIClient()
        resp = _login(client)

        assert resp.cookies.get(settings.CSRF_COOKIE_NAME) is not None
        # httponly is a flag attribute: Django omits it (empty) when False,
        # which is what we want - the SPA must read it to set the header.
        assert not resp.cookies[settings.CSRF_COOKIE_NAME]["httponly"]
        assert resp.cookies[settings.CSRF_COOKIE_NAME]["path"] == "/"

    def test_jwt_cookies_are_never_readable_by_js(self, user):
        """httpOnly on the tokens is the XSS defence; only csrftoken is readable."""
        from django.conf import settings

        from rest_framework.test import APIClient

        client = APIClient()
        resp = _login(client)

        assert resp.cookies[settings.COOKIE_NAME_ACCESS]["httponly"] is True
        assert resp.cookies[settings.COOKIE_NAME_REFRESH]["httponly"] is True

    def test_refresh_returns_new_access_cookie(self, user):
        """The interceptor's refresh must re-set the cookie or the retry 401s too."""
        from django.conf import settings

        from rest_framework.test import APIClient

        client = APIClient()
        _login(client)
        resp = client.post(reverse("auth-refresh"), content_type="application/json")

        assert resp.status_code == 200
        assert resp.cookies.get(settings.COOKIE_NAME_ACCESS) is not None

    def test_refresh_never_returns_500(self, user):
        """Regression: the old handler called RefreshToken.rotate(), which does not
        exist in SimpleJWT, so every refresh raised AttributeError -> HTTP 500 and
        the client treated it as a dead session and signed everyone out."""
        from rest_framework.test import APIClient

        client = APIClient()
        _login(client)
        resp = client.post(reverse("auth-refresh"), content_type="application/json")

        assert resp.status_code != 500
        assert resp.status_code == 200

    def test_refresh_without_cookie_is_400_not_500(self, user):
        from rest_framework.test import APIClient

        client = APIClient()
        resp = client.post(reverse("auth-refresh"), content_type="application/json")

        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_refresh_with_garbage_token_is_401(self, user):
        """An invalid refresh must 401 (envelope), never crash the handler."""
        client = Client()
        client.cookies["fet_refresh"] = "not-a-real-token"
        resp = client.post(reverse("auth-refresh"), content_type="application/json")

        assert resp.status_code == 401
        assert resp.json()["success"] is False

    def test_reused_refresh_token_is_rejected_after_rotation(self, user):
        """BLACKLIST_AFTER_ROTATION must actually take effect on replay."""
        from rest_framework.test import APIClient

        client = APIClient()
        _login(client)
        original = client.cookies["fet_refresh"].value

        first = client.post(reverse("auth-refresh"), content_type="application/json")
        assert first.status_code == 200
        rotated = client.cookies["fet_refresh"].value
        assert rotated != original

        # Replaying the pre-rotation token must fail rather than mint new ones.
        client.cookies["fet_refresh"] = original
        replay = client.post(reverse("auth-refresh"), content_type="application/json")
        assert replay.status_code == 401

    def test_logout_clears_cookies_matching_the_paths(self, user):
        """delete_cookie must use the same path/domain as set_cookie, or the
        original cookie survives logout."""
        from django.conf import settings

        from rest_framework.test import APIClient

        client = APIClient()
        _login(client)
        resp = client.post(reverse("auth-logout"), content_type="application/json")

        assert resp.status_code == 204
        assert resp.cookies[settings.COOKIE_NAME_ACCESS]["path"] == "/api/"
        assert resp.cookies[settings.COOKIE_NAME_REFRESH]["path"] == "/api/v1/auth/"
        assert resp.cookies[settings.COOKIE_NAME_ACCESS]["max-age"] == 0
        assert resp.cookies[settings.COOKIE_NAME_REFRESH]["max-age"] == 0


@pytest.mark.django_db
class TestCrossSiteCookieFallback:
    """The cross-site (SameSite=None) path, kept working for iOS 17+ via CHIPS."""

    def test_partitioned_flag_is_applied_when_cross_site(self, user, settings, monkeypatch):
        """CHIPS must reach the wire, not just the settings object.

        Django's set_cookie() has no `partitioned` kwarg, so this exercises the
        Morsel path in apps.accounts.authentication.
        """
        import http.cookies

        from rest_framework.test import APIClient

        monkeypatch.setattr(settings, "COOKIE_SAMESITE", "None")
        monkeypatch.setattr(settings, "COOKIE_PARTITIONED", True)

        client = APIClient()
        resp = _login(client)

        assert resp.status_code == 200
        assert resp.cookies["fet_access"]["samesite"] == "None"

        if "partitioned" not in http.cookies.Morsel()._reserved:
            pytest.skip("Python < 3.14: Morsel cannot serialise Partitioned")

        # Flag attributes read back as '' (present) rather than True.
        assert resp.cookies["fet_access"]["partitioned"], "access cookie missing Partitioned"
        assert resp.cookies["fet_refresh"]["partitioned"], "refresh cookie missing Partitioned"
        # CSRF cookie must match, or Safari treats it as a distinct cookie.
        assert resp.cookies["csrftoken"]["partitioned"], "csrf cookie missing Partitioned"

    def test_partitioned_appears_in_raw_set_cookie_header(self, user, settings, monkeypatch):
        """Belt-and-braces: assert it survives into the serialised header bytes."""
        import http.cookies

        from rest_framework.test import APIClient

        monkeypatch.setattr(settings, "COOKIE_SAMESITE", "None")
        monkeypatch.setattr(settings, "COOKIE_PARTITIONED", True)

        client = APIClient()
        resp = _login(client)

        if "partitioned" not in http.cookies.Morsel()._reserved:
            pytest.skip("Python < 3.14: Morsel cannot serialise Partitioned")

        # response.cookies.output() is exactly what Django writes to the wire.
        raw = resp.cookies.output()
        assert raw.count("Partitioned") == 3, raw


@pytest.mark.django_db
class TestSessionExpiredGuard:
    """/auth/me must 401 without cookies so the client can detect a dead session."""

    def test_me_without_cookies_is_401(self, user):
        from rest_framework.test import APIClient

        client = APIClient()
        assert client.get(reverse("auth-me")).status_code == 401