"""Cookie authentication requires CSRF on writes; bearer tokens do not."""
import pytest
from django.conf import settings
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.mark.django_db
def test_cookie_write_requires_csrf_and_valid_header_allows_it():
    User.objects.create_user(email="csrf@test.edu", password="pass1234")
    client = APIClient(enforce_csrf_checks=True)
    login = client.post("/api/v1/auth/login/", {"email": "csrf@test.edu", "password": "pass1234"}, format="json")
    assert login.status_code == 200, login.content
    assert client.post("/api/v1/auth/logout/").status_code == 403
    csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
    assert client.post("/api/v1/auth/logout/", HTTP_X_CSRFTOKEN=csrf).status_code == 204


@pytest.mark.django_db
def test_refresh_cookie_requires_csrf():
    User.objects.create_user(email="refresh-csrf@test.edu", password="pass1234")
    client = APIClient(enforce_csrf_checks=True)
    login = client.post("/api/v1/auth/login/", {"email": "refresh-csrf@test.edu", "password": "pass1234"}, format="json")
    assert login.status_code == 200, login.content
    csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
    del client.cookies[settings.COOKIE_NAME_ACCESS]
    assert client.post("/api/v1/auth/refresh/").status_code == 403
    assert client.post("/api/v1/auth/refresh/", HTTP_X_CSRFTOKEN=csrf).status_code == 200
