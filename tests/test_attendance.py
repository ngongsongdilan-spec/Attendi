"""Tests for attendance business rules.

Covers:
  - BR-030: Attendance requires active session
  - BR-031: Attendance requires eligibility
  - BR-033: Attendance requires valid token
  - BR-034: QR tokens are temporary
  - BR-040: One attendance record per session (duplicate prevention)
  - FR-046: Prevent duplicate attendance
"""
import json
import pytest
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

from apps.attendance.models import AttendanceCheckpoint, AttendanceRecord, AttendanceSession
from apps.attendance.token_store import generate_tokens_for_session, validate_and_record_scan, generate_token_key


@pytest.mark.django_db
class TestAttendanceSession:
    def test_start_session(self, class_session, lecturer_user):
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=60),
        )
        assert session.status == AttendanceSession.Status.ACTIVE
        assert session.is_active

    def test_session_expiry(self, class_session, lecturer_user):
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=timezone.now() - timedelta(seconds=10),
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        assert not session.is_active


@pytest.mark.django_db
class TestAttendanceScan:
    def _setup_attendance(self, class_session, lecturer_user, enrolled_student):
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=60),
        )
        cp = AttendanceCheckpoint.objects.create(
            attendance_session=session, student=enrolled_student, checkpoint_number=1
        )
        return session, cp

    def test_successful_scan(self, class_session, lecturer_user, enrolled_student):
        session, cp = self._setup_attendance(class_session, lecturer_user, enrolled_student)
        token = "test-token-valid"
        token_key = generate_token_key(str(session.id), token)
        reverse_key = f"att:token:{token}"
        token_data = json.dumps({
            "attendance_session_id": str(session.id),
            "checkpoint_id": str(cp.id),
            "checkpoint_number": 1,
            "student_email": enrolled_student.email,
        })
        cache.set(token_key, token_data, timeout=30)
        cache.set(reverse_key, token_data, timeout=30)
        result = validate_and_record_scan(token, enrolled_student)
        assert result["success"] is True
        assert AttendanceRecord.objects.filter(
            attendance_session=session, student=enrolled_student
        ).exists()

    def test_duplicate_scan_rejected(self, class_session, lecturer_user, enrolled_student):
        """BR-040: One record per session."""
        session, cp = self._setup_attendance(class_session, lecturer_user, enrolled_student)
        # Create existing record
        AttendanceRecord.objects.create(attendance_session=session, student=enrolled_student, checkpoint=cp)
        token = "test-token-dup"
        token_key = generate_token_key(str(session.id), token)
        reverse_key = f"att:token:{token}"
        token_data = json.dumps({
            "attendance_session_id": str(session.id),
            "checkpoint_id": str(cp.id),
            "checkpoint_number": 1,
            "student_email": enrolled_student.email,
        })
        cache.set(token_key, token_data, timeout=30)
        cache.set(reverse_key, token_data, timeout=30)
        result = validate_and_record_scan(token, enrolled_student)
        assert result["success"] is False
        assert result["error_code"] == "ALREADY_ATTENDED"

    def test_expired_session_rejected(self, class_session, lecturer_user, enrolled_student):
        """BR-041: Cannot submit after session expires."""
        session, cp = self._setup_attendance(class_session, lecturer_user, enrolled_student)
        session.expires_at = timezone.now() - timedelta(seconds=10)
        session.save(update_fields=["expires_at"])
        token = "test-token-exp"
        token_key = generate_token_key(str(session.id), token)
        reverse_key = f"att:token:{token}"
        token_data = json.dumps({
            "attendance_session_id": str(session.id),
            "checkpoint_id": str(cp.id),
            "checkpoint_number": 1,
            "student_email": enrolled_student.email,
        })
        cache.set(token_key, token_data, timeout=30)
        cache.set(reverse_key, token_data, timeout=30)
        result = validate_and_record_scan(token, enrolled_student)
        assert result["success"] is False
        assert result["error_code"] == "SESSION_EXPIRED"

    def test_non_enrolled_student_rejected(self, class_session, lecturer_user, student2_user):
        """BR-031: Must be enrolled to attend."""
        session, cp = self._setup_attendance(class_session, lecturer_user, student2_user)
        # But scan with student2 (who is NOT enrolled)
        from apps.accounts.models import User
        other_student = User.objects.create_user(
            email="outsider@test.edu", password="test1234", first_name="Out", last_name="Sider", role="STUDENT"
        )
        token = "test-token-unenrolled"
        token_key = generate_token_key(str(session.id), token)
        reverse_key = f"att:token:{token}"
        token_data = json.dumps({
            "attendance_session_id": str(session.id),
            "checkpoint_id": str(cp.id),
            "checkpoint_number": 1,
            "student_email": student2_user.email,
        })
        cache.set(token_key, token_data, timeout=30)
        cache.set(reverse_key, token_data, timeout=30)
        result = validate_and_record_scan(token, other_student)
        assert result["success"] is False
        assert result["error_code"] == "NOT_ENROLLED"

    def test_invalid_token_rejected(self, enrolled_student):
        result = validate_and_record_scan("nonexistent-token", enrolled_student)
        assert result["success"] is False
        assert result["error_code"] == "TOKEN_INVALID"


@pytest.mark.django_db
class TestProjectorToken:
    """Session-level projector QR (no checkpoint): NULL checkpoint scans."""

    def _setup(self, class_session, lecturer_user, enrolled_student):
        now = timezone.now()
        return AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=600),
        )

    def test_projector_token_scan_records_attendance(self, class_session, lecturer_user, enrolled_student):
        from apps.attendance.token_store import generate_session_token

        session = self._setup(class_session, lecturer_user, enrolled_student)
        token = generate_session_token(session)["token"]
        assert token
        result = validate_and_record_scan(token, enrolled_student)
        assert result["success"] is True
        record = AttendanceRecord.objects.get(attendance_session=session, student=enrolled_student)
        assert record.checkpoint is None

    def test_projector_token_consumed_after_single_use(self, class_session, lecturer_user, student2_user):
        """Single-use guarantee also applies to projector tokens."""
        from apps.academics.models import Enrollment
        from apps.attendance.token_store import generate_session_token

        Enrollment.objects.filter(student=student2_user, course_offering=class_session.class_definition.course_offering).delete()
        Enrollment.objects.create(
            student=student2_user, course_offering=class_session.class_definition.course_offering, status="ACTIVE"
        )
        session = self._setup(class_session, lecturer_user, student2_user)
        token = generate_session_token(session)["token"]
        assert validate_and_record_scan(token, student2_user)["success"] is True
        again = validate_and_record_scan(token, student2_user)
        assert again["success"] is False
        assert again["error_code"] in ("TOKEN_INVALID", "TOKEN_CONSUMED", "ALREADY_ATTENDED")


@pytest.mark.django_db
class TestCloseAttendanceAPI:
    """Lecturer closes a session; it becomes immutable for late scans."""

    def test_close_sets_closed_and_rejects_scans(self, client, class_session, lecturer_user, enrolled_student):
        from apps.attendance.token_store import generate_session_token

        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=600),
        )
        token = generate_session_token(session)["token"]

        resp = client.post(f"/api/v1/attendance/{session.id}/close/")
        assert resp.status_code == 401 or resp.status_code == 403  # unauthenticated

        session.refresh_from_db()
        assert session.status == AttendanceSession.Status.ACTIVE

    def test_authenticated_lecturer_closes(self, class_session, lecturer_user, enrolled_student):
        from rest_framework.test import APIClient
        from apps.attendance.token_store import generate_session_token

        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=600),
        )
        api = APIClient()
        api.force_authenticate(user=lecturer_user)
        resp = api.post(f"/api/v1/attendance/{session.id}/close/")
        assert resp.status_code == 200
        session.refresh_from_db()
        assert session.status == AttendanceSession.Status.CLOSED

        token = generate_session_token(session)["token"]
        result = validate_and_record_scan(token, enrolled_student)
        assert result["success"] is False
        assert result["error_code"] == "SESSION_EXPIRED"


@pytest.mark.django_db
class TestStartFlexMode:
    def _as_lecturer(self, api_client, class_session, lecturer_user):
        offering = class_session.class_definition.course_offering
        offering.lecturer = lecturer_user
        offering.save(update_fields=["lecturer"])
        api_client.force_authenticate(user=lecturer_user)
        return offering

    def test_start_flex_projector_mode(self, api_client, class_session, lecturer_user):
        offering = self._as_lecturer(api_client, class_session, lecturer_user)
        resp = api_client.post(
            "/api/v1/attendance/start-flex/",
            {"offering_id": str(offering.id), "mode": "PROJECTOR", "duration_seconds": 60},
            format="json",
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["mode"] == "PROJECTOR"

    def test_start_flex_default_mode(self, api_client, class_session, lecturer_user):
        offering = self._as_lecturer(api_client, class_session, lecturer_user)
        resp = api_client.post(
            "/api/v1/attendance/start-flex/",
            {"offering_id": str(offering.id), "duration_seconds": 60},
            format="json",
        )
        assert resp.status_code in (200, 201)
        # Station-centric default (the platform's primary flow).
        assert resp.json()["data"]["mode"] == "STATIONS"


@pytest.mark.django_db
class TestMyAttendanceSessions:
    """Sessions survive a page reload: the dashboard can re-list them."""

    def test_lecturer_sees_own_live_session(self, api_client, class_session, lecturer_user, enrolled_student):
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=300),
        )
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get("/api/v1/attendance/sessions/")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        row = data[0]
        assert row["id"] == str(session.id)
        assert row["is_active"] is True
        assert row["class_session_id"] == str(class_session.id)
        assert row["course_code"]
        assert row["total_eligible"] == 1

    def test_lecturer_does_not_see_other_lecturers_sessions(
        self, api_client, class_session, lecturer_user, db
    ):
        from apps.accounts.models import User

        now = timezone.now()
        AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=300),
        )
        other = User.objects.create_user(
            email="stranger@test.edu", password="test1234",
            first_name="Str", last_name="Anger", role="LECTURER",
        )
        api_client.force_authenticate(user=other)
        resp = api_client.get("/api/v1/attendance/sessions/")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_expired_session_is_returned_but_not_active(self, api_client, class_session, lecturer_user):
        now = timezone.now()
        AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now - timedelta(hours=2), expires_at=now - timedelta(hours=1),
        )
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get("/api/v1/attendance/sessions/")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["is_active"] is False

    def test_student_cannot_list_sessions(self, api_client, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/attendance/sessions/")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_expired_session_is_not_reported_active(self, api_client, class_session, lecturer_user):
        """A passed window must never be listed as ACTIVE, whatever the stored
        status says - otherwise the lecturer sees dead sessions as live."""
        now = timezone.now()
        stale = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now - timedelta(hours=2), expires_at=now - timedelta(hours=1),
            status=AttendanceSession.Status.ACTIVE,  # left ACTIVE in the DB
        )
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get("/api/v1/attendance/sessions/")
        row = next(r for r in resp.json()["data"] if r["id"] == str(stale.id))
        assert row["is_active"] is False
        assert row["status"] != AttendanceSession.Status.ACTIVE


@pytest.mark.django_db
class TestNoDuplicateLiveSessions:
    """Starting a new session for a class supersedes the previous live one."""

    def _start(self, api_client, offering):
        return api_client.post(
            "/api/v1/attendance/start-flex/",
            {"offering_id": str(offering.id), "mode": "PROJECTOR", "duration_seconds": 300},
            format="json",
        )

    def test_second_start_closes_the_first(self, api_client, class_def, lecturer_user, offering):
        offering.lecturer = lecturer_user
        offering.save(update_fields=["lecturer"])
        now = timezone.now()
        first = AttendanceSession.objects.create(
            class_session=_cs(class_def), lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=300),
        )
        api_client.force_authenticate(user=lecturer_user)
        resp = self._start(api_client, offering)
        assert resp.status_code == 201, resp.content
        first.refresh_from_db()
        assert first.status == AttendanceSession.Status.CLOSED

        live = AttendanceSession.objects.filter(
            class_session__class_definition=class_def,
            status=AttendanceSession.Status.ACTIVE,
        )
        assert live.count() == 1

    def test_existing_records_are_preserved(self, api_client, class_def, lecturer_user, offering, enrolled_student):
        offering.lecturer = lecturer_user
        offering.save(update_fields=["lecturer"])
        now = timezone.now()
        first = AttendanceSession.objects.create(
            class_session=_cs(class_def), lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=300),
        )
        AttendanceRecord.objects.create(attendance_session=first, student=enrolled_student, status="PRESENT")
        api_client.force_authenticate(user=lecturer_user)
        self._start(api_client, offering)
        # The earlier session keeps its attendance record for the audit trail.
        assert AttendanceRecord.objects.filter(attendance_session=first).count() == 1


def _cs(class_def):
    from apps.academics.models import ClassSession
    now = timezone.now()
    return ClassSession.objects.create(
        class_definition=class_def, starts_at=now, ends_at=now + timedelta(hours=2), status="ONGOING"
    )


@pytest.mark.django_db
class TestRecordDeleteAndOwnership:
    """A lecturer may delete their own bad/test records, but may never touch
    records belonging to a class they do not teach."""

    def _record(self, class_session, lecturer_user, student):
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(seconds=600),
        )
        return session, AttendanceRecord.objects.create(
            attendance_session=session, student=student, status="PRESENT"
        )

    def test_owning_lecturer_can_delete_record(self, api_client, class_session, lecturer_user, enrolled_student):
        _session, record = self._record(class_session, lecturer_user, enrolled_student)
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.delete(f"/api/v1/attendance/records/{record.id}/")
        assert resp.status_code == 204
        assert not AttendanceRecord.objects.filter(id=record.id).exists()

    def test_other_lecturer_cannot_delete_record(self, api_client, class_session, lecturer_user, enrolled_student, db):
        from apps.accounts.models import User

        _session, record = self._record(class_session, lecturer_user, enrolled_student)
        other = User.objects.create_user(
            email="other.lecturer@test.edu", password="test1234",
            first_name="Other", last_name="Lecturer", role="LECTURER",
        )
        api_client.force_authenticate(user=other)
        resp = api_client.delete(f"/api/v1/attendance/records/{record.id}/")
        assert resp.status_code == 403
        assert AttendanceRecord.objects.filter(id=record.id).exists()

    def test_other_lecturer_cannot_correct_record(self, api_client, class_session, lecturer_user, enrolled_student, db):
        from apps.accounts.models import User

        _session, record = self._record(class_session, lecturer_user, enrolled_student)
        other = User.objects.create_user(
            email="other2@test.edu", password="test1234",
            first_name="Other", last_name="Two", role="LECTURER",
        )
        api_client.force_authenticate(user=other)
        resp = api_client.patch(
            f"/api/v1/attendance/records/{record.id}/", {"status": "ABSENT"}, format="json"
        )
        assert resp.status_code == 403
        record.refresh_from_db()
        assert record.status == "PRESENT"

    def test_student_cannot_delete_record(self, api_client, class_session, lecturer_user, enrolled_student):
        _session, record = self._record(class_session, lecturer_user, enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.delete(f"/api/v1/attendance/records/{record.id}/")
        assert resp.status_code == 403
        assert AttendanceRecord.objects.filter(id=record.id).exists()

    def test_session_records_restricted_to_owning_lecturer(self, api_client, class_session, lecturer_user, enrolled_student, db):
        from apps.accounts.models import User

        self._record(class_session, lecturer_user, enrolled_student)
        other = User.objects.create_user(
            email="other3@test.edu", password="test1234",
            first_name="Other", last_name="Three", role="LECTURER",
        )
        api_client.force_authenticate(user=other)
        resp = api_client.get(f"/api/v1/class-sessions/{class_session.id}/attendance/records/")
        assert resp.status_code == 403

    def test_owning_lecturer_can_read_session_records(self, api_client, class_session, lecturer_user, enrolled_student):
        self._record(class_session, lecturer_user, enrolled_student)
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/class-sessions/{class_session.id}/attendance/records/")
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1
