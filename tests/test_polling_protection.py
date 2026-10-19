"""Regression tests for read traffic controls."""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.cache.backends.locmem import LocMemCache
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.attendance.models import AttendanceSession, PointsLedger
from apps.attendance.views import MyStationView
from apps.core.checks import redis_required_for_traffic_mode
from apps.core.throttling import PollingRateThrottle


@pytest.mark.django_db
def test_station_poll_stops_before_view_queries(api_client, enrolled_student, student2_user, monkeypatch):
    monkeypatch.setattr(PollingRateThrottle, "cache", LocMemCache("poll-test", {}))
    monkeypatch.setattr(PollingRateThrottle, "THROTTLE_RATES", {
        **PollingRateThrottle.THROTTLE_RATES,
        "attendance_station_poll": "2/minute",
    })
    api_client.force_authenticate(user=enrolled_student)
    url = "/api/v1/students/me/station/"
    assert api_client.get(url).status_code == 200
    assert api_client.get(url).status_code == 200

    with patch.object(MyStationView, "get", side_effect=AssertionError("view should not run")):
        response = api_client.get(url)
    assert response.status_code == 429
    assert "Retry-After" in response

    # A different account has its own quota.
    api_client.force_authenticate(user=student2_user)
    assert api_client.get(url).status_code == 200


def test_aws_traffic_mode_requires_redis():
    with override_settings(REQUIRE_REDIS_FOR_TRAFFIC=True, REDIS_URL=""):
        assert redis_required_for_traffic_mode(None)[0].id == "fet.E007"
    with override_settings(REQUIRE_REDIS_FOR_TRAFFIC=True, REDIS_URL="redis://example:6379/0"):
        assert redis_required_for_traffic_mode(None) == []


@pytest.mark.django_db
def test_session_list_limits_finished_sessions_in_database(api_client, lecturer_user, class_session):
    now = timezone.now()
    for i in range(20):
        AttendanceSession.objects.create(
            class_session=class_session,
            lecturer=lecturer_user,
            started_at=now - timedelta(days=i + 1),
            expires_at=now - timedelta(days=i + 1) + timedelta(minutes=5),
            status=AttendanceSession.Status.CLOSED,
        )
    active = AttendanceSession.objects.create(
        class_session=class_session,
        lecturer=lecturer_user,
        started_at=now,
        expires_at=now + timedelta(minutes=5),
    )
    api_client.force_authenticate(user=lecturer_user)
    with CaptureQueriesContext(connection) as queries:
        data = api_client.get("/api/v1/attendance/sessions/").json()["data"]
    assert len(data) == 11
    assert data[0]["id"] == str(active.id)
    assert len(queries) <= 8, "session list should not issue a query per row"


@pytest.mark.django_db
def test_points_totals_group_same_category(api_client, enrolled_student, lecturer_user, class_session):
    now = timezone.now()
    for points in (3, 4):
        session = AttendanceSession.objects.create(
            class_session=class_session,
            lecturer=lecturer_user,
            started_at=now,
            expires_at=now + timedelta(minutes=5),
        )
        PointsLedger.objects.create(
            attendance_session=session,
            student=enrolled_student,
            category=PointsLedger.Category.SCAN,
            points=points,
        )
    api_client.force_authenticate(user=enrolled_student)
    data = api_client.get("/api/v1/students/me/points/").json()["data"]
    assert data["total_points"] == 7
    assert data["by_category"]["SCAN"] == 7
    assert len(data["recent"]) == 2
