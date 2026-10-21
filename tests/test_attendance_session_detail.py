"""Tests for the lecturer attendance session detail view.

Covers the detailed per-session register:

  GET /api/v1/attendance/{attendance_session_id}/records/

Each row must carry the student's name, matricule (student_number), department
and level, and the endpoint must be scoped to the lecturer who owns the class.
"""
import pytest
from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import User
from apps.attendance.models import AttendanceRecord, AttendanceSession


@pytest.mark.django_db
class TestAttendanceSessionDetail:
    def _session(self, class_session, lecturer_user):
        now = timezone.now()
        return AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now - timedelta(minutes=5), expires_at=now + timedelta(minutes=5),
        )

    def test_detail_returns_student_profile_fields(
        self, api_client, class_session, lecturer_user, enrolled_student
    ):
        session = self._session(class_session, lecturer_user)
        AttendanceRecord.objects.create(
            attendance_session=session, student=enrolled_student, status="PRESENT",
        )
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/attendance/{session.id}/records/")
        assert resp.status_code == 200
        data = resp.json()["data"]

        assert data["session"]["id"] == str(session.id)
        assert data["session"]["course_code"] == "CSC301"
        assert data["session"]["class_name"] == "CSC301 Lecture"
        assert data["session"]["present"] == 1
        assert data["session"]["total_eligible"] == 1

        assert len(data["records"]) == 1
        row = data["records"][0]
        assert row["student_name"] == "Test Student"
        assert row["student_number"] == "STU001"
        assert row["department"] == "Computer Science"
        assert row["recorded_at"]
        assert row["status"] == "PRESENT"

    def test_detail_only_includes_this_sessions_records(
        self, api_client, class_session, lecturer_user, enrolled_student
    ):
        current = self._session(class_session, lecturer_user)
        # A second, finished session for the same class with its own record.
        now = timezone.now()
        older = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now - timedelta(hours=2), expires_at=now - timedelta(hours=1),
        )
        AttendanceRecord.objects.create(attendance_session=older, student=enrolled_student, status="PRESENT")

        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/attendance/{current.id}/records/")
        assert resp.status_code == 200
        assert resp.json()["data"]["records"] == []
        assert resp.json()["data"]["session"]["present"] == 0

    def test_other_lecturer_is_forbidden(
        self, api_client, class_session, lecturer_user, enrolled_student
    ):
        session = self._session(class_session, lecturer_user)
        AttendanceRecord.objects.create(
            attendance_session=session, student=enrolled_student, status="PRESENT",
        )
        stranger = User.objects.create_user(
            email="stranger@test.edu", password="test1234",
            first_name="Str", last_name="Anger", role="LECTURER",
        )
        api_client.force_authenticate(user=stranger)
        resp = api_client.get(f"/api/v1/attendance/{session.id}/records/")
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"

    def test_unauthenticated_is_rejected(self, api_client, class_session, lecturer_user):
        session = self._session(class_session, lecturer_user)
        resp = api_client.get(f"/api/v1/attendance/{session.id}/records/")
        assert resp.status_code in (401, 403)

    def test_missing_profile_does_not_break_serialization(
        self, api_client, class_session, lecturer_user, student2_user, offering
    ):
        from apps.academics.models import Enrollment
        # A student with no StudentProfile must still serialize (blank fields).
        Enrollment.objects.create(student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE)
        student2_user.student_profile.delete()
        session = self._session(class_session, lecturer_user)
        AttendanceRecord.objects.create(
            attendance_session=session, student=student2_user, status="PRESENT",
        )
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/attendance/{session.id}/records/")
        assert resp.status_code == 200
        row = resp.json()["data"]["records"][0]
        assert row["student_number"] == ""
        assert row["department"] == ""
        assert row["level"] == ""
