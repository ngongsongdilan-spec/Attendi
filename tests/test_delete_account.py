"""Delete-own-account endpoint.

Guards the contract of the soft delete:
  * any role may delete their own account (student, lecturer, admin),
  * the account is deactivated/archived and can no longer sign in,
  * every refresh token for the account is revoked,
  * unauthenticated callers are rejected.
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.authentication import get_token_pair_for_user
from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def _user(role=User.Role.STUDENT, email="delete.me@test.edu"):
    return User.objects.create_user(
        email=email, password="OldPass123", first_name="De", last_name="Lete", role=role
    )


def test_student_deletes_own_account_and_cannot_sign_in_again():
    user = _user()
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.delete(reverse("auth-delete-account"))
    assert resp.status_code == 200

    user.refresh_from_db()
    assert user.is_active is False
    assert user.status == User.Status.ARCHIVED

    # The archived account can no longer log in (LoginView rejects non-active).
    anon = APIClient()
    login = anon.post(
        reverse("auth-login"),
        {"email": "delete.me@test.edu", "password": "OldPass123"},
        format="json",
    )
    assert login.status_code == 403


def test_lecturer_can_delete_own_account():
    user = _user(role=User.Role.LECTURER, email="lect@test.edu")
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.delete(reverse("auth-delete-account"))
    assert resp.status_code == 200

    user.refresh_from_db()
    assert user.is_active is False
    assert user.status == User.Status.ARCHIVED


def test_admin_can_delete_own_account():
    user = _user(role=User.Role.SYSTEM_ADMIN, email="admin@test.edu")
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.delete(reverse("auth-delete-account"))
    assert resp.status_code == 200

    user.refresh_from_db()
    assert user.is_active is False
    assert user.status == User.Status.ARCHIVED


def test_unauthenticated_cannot_delete():
    resp = APIClient().delete(reverse("auth-delete-account"))
    assert resp.status_code in (401, 403)


def test_deleting_revokes_every_refresh_token():
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    user = _user(email="revoke.me@test.edu")
    get_token_pair_for_user(user)  # mints an outstanding refresh token
    assert OutstandingToken.objects.filter(user=user).exists()

    client = APIClient()
    client.force_authenticate(user=user)
    assert client.delete(reverse("auth-delete-account")).status_code == 200

    outstanding = OutstandingToken.objects.filter(user=user)
    assert outstanding.exists()
    blacklisted = BlacklistedToken.objects.filter(token__in=outstanding).count()
    assert blacklisted == outstanding.count()
