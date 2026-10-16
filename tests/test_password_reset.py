"""Password reset flow (6-digit email OTP).

Guards the security contract of the OTP reset:
  * the raw code is never persisted (only its SHA-256 hash),
  * responses never reveal whether an account exists,
  * the code is single-use, time-bound, and burned after too many guesses,
  * a successful reset revokes every existing session.
"""
import hashlib
from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db

GENERIC = "If an account exists with this email, an OTP has been sent."
MAX_ATTEMPTS = 5


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """Reset the DRF throttle counter between tests (3/15min would otherwise leak)."""
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user():
    return User.objects.create_user(
        email="reset@test.edu", password="OldPass123", first_name="Re", last_name="Set"
    )


@pytest.fixture
def client():
    return APIClient()


def _request_otp(client, email="reset@test.edu"):
    return client.post(reverse("auth-request-otp"), {"email": email}, format="json")


def _confirm(client, email="reset@test.edu", otp="000000", new_password="BrandNew123"):
    return client.post(
        reverse("auth-confirm-reset"),
        {"email": email, "otp": otp, "new_password": new_password},
        format="json",
    )


def _capture_otp(monkeypatch):
    """Patch the email sender so we can read the raw code that would go out."""
    captured = {}

    def fake_send(user, otp):
        captured["user"] = user
        captured["otp"] = otp
        return True

    monkeypatch.setattr("apps.accounts.views_auth.send_password_reset_otp_email", fake_send)
    monkeypatch.setattr("apps.accounts.views_auth.send_password_changed_email", lambda u: True)
    return captured


def _seed_otp(user, otp="123456", expires_in=timedelta(minutes=10), attempts=0):
    user.reset_otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    user.reset_otp_expires = timezone.now() + expires_in
    user.reset_otp_attempts = attempts
    user.save(
        update_fields=["reset_otp_hash", "reset_otp_expires", "reset_otp_attempts", "updated_at"]
    )


# ---------------------------------------------------------------------------
# Request OTP
# ---------------------------------------------------------------------------

def test_request_otp_stores_only_the_hash_and_emails_the_code(client, user, monkeypatch):
    captured = _capture_otp(monkeypatch)

    resp = _request_otp(client)

    assert resp.status_code == 200
    assert resp.json()["data"]["message"] == GENERIC

    user.refresh_from_db()
    raw = captured["otp"]
    assert raw and len(raw) == 6 and raw.isdigit()
    assert user.reset_otp_hash == hashlib.sha256(raw.encode()).hexdigest()
    # The raw code must never be recoverable from the stored value.
    assert raw != user.reset_otp_hash
    assert user.reset_otp_expires > timezone.now()
    assert user.reset_otp_attempts == 0


def test_request_otp_is_generic_and_sends_nothing_for_unknown_email(client, monkeypatch):
    sent = {"called": False}

    def fake_send(*args, **kwargs):
        sent["called"] = True
        return True

    monkeypatch.setattr("apps.accounts.views_auth.send_password_reset_otp_email", fake_send)

    resp = _request_otp(client, "nobody@test.edu")

    assert resp.status_code == 200
    assert resp.json()["data"]["message"] == GENERIC
    assert sent["called"] is False


def test_request_otp_requires_a_valid_email(client):
    resp = client.post(reverse("auth-request-otp"), {"email": "not-an-email"}, format="json")
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Confirm reset
# ---------------------------------------------------------------------------

def test_confirm_with_valid_otp_changes_password_and_clears_fields(client, user, monkeypatch):
    captured = _capture_otp(monkeypatch)
    _request_otp(client)

    resp = _confirm(client, otp=captured["otp"])

    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.check_password("BrandNew123")
    assert user.reset_otp_hash is None
    assert user.reset_otp_expires is None
    assert user.reset_otp_attempts == 0


def test_otp_is_single_use(client, user, monkeypatch):
    captured = _capture_otp(monkeypatch)
    _request_otp(client)

    assert _confirm(client, otp=captured["otp"]).status_code == 200
    # Replaying the same code must fail now that it is consumed.
    assert _confirm(client, otp=captured["otp"], new_password="AnotherPass123").status_code == 400


def test_confirm_rejects_wrong_otp_and_increments_attempts(client, user):
    _seed_otp(user, otp="123456")

    resp = _confirm(client, otp="999999")

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_OTP"
    user.refresh_from_db()
    assert user.reset_otp_attempts == 1
    # A wrong guess must not clear a still-valid code.
    assert user.reset_otp_hash is not None


def test_confirm_burns_otp_after_too_many_attempts(client, user):
    _seed_otp(user, otp="123456", attempts=MAX_ATTEMPTS)

    resp = _confirm(client, otp="123456")  # even the correct code is refused

    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "TOO_MANY_ATTEMPTS"
    user.refresh_from_db()
    assert user.reset_otp_hash is None
    assert user.reset_otp_expires is None
    assert user.reset_otp_attempts == 0


def test_confirm_rejects_expired_otp(client, user):
    _seed_otp(user, otp="123456", expires_in=timedelta(minutes=-1))

    resp = _confirm(client, otp="123456")

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_OTP"


def test_confirm_rejects_when_no_otp_was_requested(client, user):
    resp = _confirm(client, otp="123456")
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_OTP"


def test_confirm_rejects_unknown_email(client):
    resp = _confirm(client, email="ghost@test.edu", otp="123456")
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_OTP"


def test_confirm_rejects_malformed_otp(client, user):
    _seed_otp(user, otp="123456")
    resp = _confirm(client, otp="12ab56")
    assert resp.status_code == 400


def test_confirm_enforces_password_validators(client, user, monkeypatch):
    captured = _capture_otp(monkeypatch)
    _request_otp(client)

    # All-numeric trips Django's NumericPasswordValidator.
    resp = _confirm(client, otp=captured["otp"], new_password="12345678")
    assert resp.status_code == 400
    user.refresh_from_db()
    # The OTP must survive a rejected password so the user can try again.
    assert user.reset_otp_hash is not None


def test_confirm_accepts_camel_case_new_password(client, user):
    _seed_otp(user, otp="123456")

    resp = client.post(
        reverse("auth-confirm-reset"),
        {"email": user.email, "otp": "123456", "newPassword": "BrandNew123"},
        format="json",
    )

    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.check_password("BrandNew123")


def test_confirm_clears_must_change_password(client, user, monkeypatch):
    captured = _capture_otp(monkeypatch)
    user.must_change_password = True
    user.save(update_fields=["must_change_password", "updated_at"])
    _request_otp(client)

    assert _confirm(client, otp=captured["otp"]).status_code == 200
    user.refresh_from_db()
    assert user.must_change_password is False


def test_confirm_revokes_all_existing_sessions(client, user, monkeypatch):
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )
    from rest_framework_simplejwt.tokens import RefreshToken

    # Two live sessions (e.g. phone + laptop) before the reset.
    RefreshToken.for_user(user)
    RefreshToken.for_user(user)
    outstanding = OutstandingToken.objects.filter(user=user).count()
    assert outstanding >= 2

    captured = _capture_otp(monkeypatch)
    _request_otp(client)
    assert _confirm(client, otp=captured["otp"]).status_code == 200

    blacklisted = BlacklistedToken.objects.filter(token__user=user).count()
    assert blacklisted == outstanding
