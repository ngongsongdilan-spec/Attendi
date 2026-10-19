"""Traffic tests for the attendance read-through cache and write invalidation."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache.backends.locmem import LocMemCache
from django.db import connection
from django.http import Http404
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.attendance import read_cache
from apps.attendance.models import AttendanceCheckpoint, AttendanceSession
from apps.core.errors import TrafficCacheUnavailable


@pytest.fixture(autouse=True)
def isolated_attendance_cache(monkeypatch):
    monkeypatch.setattr(read_cache, "READ_CACHE", LocMemCache("attendance-read-test", {}))


def test_cold_read_has_one_loader_and_can_cache_none():
    calls = []

    def load():
        calls.append(True)
        return None

    assert read_cache.cached_read("test:none", load, timeout=30) is None
    assert read_cache.cached_read("test:none", load, timeout=30) is None
    assert len(calls) == 1


def test_loader_error_is_not_changed_to_cache_error():
    with pytest.raises(Http404):
        read_cache.cached_read("test:404", lambda: (_ for _ in ()).throw(Http404()), timeout=30)


def test_cache_outage_fails_closed_without_database_loader(monkeypatch):
    class BrokenCache:
        def get(self, *args):
            raise ConnectionError("cache down")

    monkeypatch.setattr(read_cache, "READ_CACHE", BrokenCache())
    with pytest.raises(TrafficCacheUnavailable):
        read_cache.cached_read("test:down", lambda: pytest.fail("loader ran"), timeout=30)


def test_cold_follower_never_runs_database_loader(monkeypatch):
    class BusyCache:
        def get(self, key, default):
            return default

        def add(self, *args, **kwargs):
            return False

    monkeypatch.setattr(read_cache, "READ_CACHE", BusyCache())
    monkeypatch.setattr(read_cache.time, "sleep", lambda _: None)
    with pytest.raises(TrafficCacheUnavailable):
        read_cache.cached_read("test:busy", lambda: pytest.fail("loader ran"), timeout=30)


def test_invalidation_during_load_cannot_publish_old_value():
    def stale_load():
        read_cache.invalidate("test:race")
        return "old"

    with pytest.raises(TrafficCacheUnavailable):
        read_cache.cached_read("test:race", stale_load, timeout=30)
    assert read_cache.cached_read("test:race", lambda: "new", timeout=30) == "new"


@pytest.mark.django_db
def test_cache_outage_returns_retryable_http_503(api_client, enrolled_student, monkeypatch):
    class BrokenCache:
        def get(self, *args):
            raise ConnectionError("cache down")

    monkeypatch.setattr(read_cache, "READ_CACHE", BrokenCache())
    api_client.force_authenticate(user=enrolled_student)
    response = api_client.get("/api/v1/students/me/station/")
    assert response.status_code == 503
    assert response["Retry-After"] == "2"


@pytest.mark.django_db
def test_station_assignment_creation_and_close_invalidate_reads(
    api_client, enrolled_student, lecturer_user, class_session,
):
    session = AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer_user,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    api_client.force_authenticate(user=enrolled_student)
    station_url = "/api/v1/students/me/station/"
    status_url = f"/api/v1/attendance/{session.id}/"

    assert api_client.get(station_url).json()["data"] is None
    AttendanceCheckpoint.objects.create(
        attendance_session=session, student=enrolled_student, checkpoint_number=1,
    )
    assert api_client.get(station_url).json()["data"]["attendance_session_id"] == str(session.id)
    assert api_client.get(status_url).json()["data"]["is_active"] is True

    session.status = AttendanceSession.Status.CLOSED
    session.save(update_fields=["status"])
    assert api_client.get(station_url).json()["data"] is None
    assert api_client.get(status_url).json()["data"]["is_active"] is False


@pytest.mark.django_db
def test_warm_live_reads_and_token_rotation_skip_attendance_database(
    api_client, enrolled_student, lecturer_user, class_session,
):
    session = AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer_user,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    AttendanceCheckpoint.objects.create(
        attendance_session=session, student=enrolled_student, checkpoint_number=1,
    )
    student_urls = [
        "/api/v1/students/me/station/",
        f"/api/v1/attendance/{session.id}/",
        f"/api/v1/attendance/{session.id}/my-station-token/",
        "/api/v1/students/me/attendance/",
        "/api/v1/students/me/points/",
    ]
    api_client.force_authenticate(user=enrolled_student)
    for url in student_urls:
        assert api_client.get(url).status_code == 200
    with CaptureQueriesContext(connection) as queries:
        for url in student_urls:
            assert api_client.get(url).status_code == 200
    assert len(queries) == 0

    api_client.force_authenticate(user=lecturer_user)
    token_url = f"/api/v1/attendance/{session.id}/tokens/"
    assert api_client.post(token_url).status_code == 200
    with CaptureQueriesContext(connection) as queries:
        response = api_client.post(token_url)
    assert response.status_code == 200
    assert response.json()["data"]["tokens"][0]["token"]
    assert len(queries) == 0


@pytest.mark.django_db
def test_student_station_token_uses_requested_session(
    api_client, enrolled_student, lecturer_user, class_session,
):
    sessions = [AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer_user,
        expires_at=timezone.now() + timedelta(minutes=5),
    ) for _ in range(2)]
    for session in sessions:
        AttendanceCheckpoint.objects.create(
            attendance_session=session, student=enrolled_student, checkpoint_number=1,
        )
    api_client.force_authenticate(user=enrolled_student)
    for session in sessions:
        response = api_client.get(f"/api/v1/attendance/{session.id}/my-station-token/")
        assert response.status_code == 200
        assert response.json()["data"]["token"]


@pytest.mark.django_db
def test_other_lecturer_cannot_read_live_attendance(api_client, lecturer_user, class_session):
    session = AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer_user,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    other = get_user_model().objects.create_user(
        email="other-lecturer@test.edu", password="test1234", role="LECTURER",
    )
    api_client.force_authenticate(user=other)
    assert api_client.get(f"/api/v1/attendance/{session.id}/").status_code == 403
