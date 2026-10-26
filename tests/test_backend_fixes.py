"""Regression tests for reliability, security and data-integrity fixes.

Each test pins a behaviour that previously went wrong:

* account status was self-editable (a user could suspend themselves)
* forgot/reset-password reported success while doing nothing
* malformed ``duration_seconds`` escaped as an HTTP 500
* self-registration could collide on a matricule (500) and silently
  saved profiles with an unknown department
* roster re-uploads could hijack a matricule owned by another account,
  aborting the entire upload
* a CourseOffering could point at a department different from its course
"""
import uuid

import pytest
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import StudentProfile, User
from apps.academics.models import CourseOffering, Department
from apps.attendance.models import AttendanceSession


def _make_user(email, role="STUDENT", **extra):
    return User.objects.create_user(
        email=email, password="pass1234", first_name="Test", last_name="User", role=role, **extra
    )


@pytest.mark.django_db
class TestAccountStatusCannotBeSelfChanged:
    def test_user_cannot_change_their_own_status(self, api_client):
        user = _make_user("self-status@test.edu")
        api_client.force_authenticate(user=user)
        resp = api_client.patch(f"/api/v1/users/{user.id}/", {"status": "SUSPENDED"}, format="json")
        assert resp.status_code == 403
        user.refresh_from_db()
        assert user.status == User.Status.ACTIVE

    def test_user_can_still_edit_their_own_name(self, api_client):
        user = _make_user("self-name@test.edu")
        api_client.force_authenticate(user=user)
        resp = api_client.patch(f"/api/v1/users/{user.id}/", {"first_name": "Renamed"}, format="json")
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "Renamed"

    def test_system_admin_can_change_status(self, api_client):
        admin = _make_user("sys-status@test.edu", role="SYSTEM_ADMIN")
        target = _make_user("target-status@test.edu")
        api_client.force_authenticate(user=admin)
        resp = api_client.patch(f"/api/v1/users/{target.id}/", {"status": "SUSPENDED"}, format="json")
        assert resp.status_code == 200
        target.refresh_from_db()
        assert target.status == User.Status.SUSPENDED

    def test_unknown_status_value_is_rejected(self, api_client):
        admin = _make_user("sys-status2@test.edu", role="SYSTEM_ADMIN")
        target = _make_user("target-status2@test.edu")
        api_client.force_authenticate(user=admin)
        resp = api_client.patch(f"/api/v1/users/{target.id}/", {"status": "BANISHED"}, format="json")
        assert resp.status_code == 400
        target.refresh_from_db()
        assert target.status == User.Status.ACTIVE


@pytest.mark.django_db
class TestPasswordResetEndpointsAreHonest:
    def test_request_otp_is_live_and_generic(self, api_client):
        resp = api_client.post(
            "/api/v1/auth/forgot-password/request-otp/",
            {"email": "who@test.edu"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["message"]

    def test_legacy_stub_endpoints_are_gone(self, api_client):
        resp = api_client.post(
            "/api/v1/auth/forgot-password/", {"email": "who@test.edu"}, format="json"
        )
        assert resp.status_code == 404


@pytest.mark.django_db
class TestMalformedDurationIsTolerated:
    def _as_lecturer(self, api_client, class_session, lecturer_user):
        offering = class_session.class_definition.course_offering
        offering.lecturer = lecturer_user
        offering.save(update_fields=["lecturer"])
        api_client.force_authenticate(user=lecturer_user)
        return offering

    def _ttl(self, session_id):
        session = AttendanceSession.objects.get(id=session_id)
        return (session.expires_at - session.started_at).total_seconds()

    def test_start_attendance_falls_back_on_garbage_duration(self, api_client, class_session, lecturer_user):
        self._as_lecturer(api_client, class_session, lecturer_user)
        resp = api_client.post(
            f"/api/v1/class-sessions/{class_session.id}/attendance/",
            {"duration_seconds": "soon"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        default = getattr(settings, "ATTENDANCE_SESSION_DEFAULT_SECONDS", 60)
        assert abs(self._ttl(resp.json()["data"]["id"]) - default) < 2

    def test_start_flex_keeps_custom_duration_above_ten_minutes(
        self, api_client, class_session, lecturer_user
    ):
        offering = self._as_lecturer(api_client, class_session, lecturer_user)
        resp = api_client.post(
            "/api/v1/attendance/start-flex/",
            {"offering_id": str(offering.id), "duration_seconds": 2400},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert abs(self._ttl(resp.json()["data"]["id"]) - 2400) < 2

    def test_start_flex_clamps_excessive_duration(self, api_client, class_session, lecturer_user):
        offering = self._as_lecturer(api_client, class_session, lecturer_user)
        resp = api_client.post(
            "/api/v1/attendance/start-flex/",
            {"offering_id": str(offering.id), "duration_seconds": "99999"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        maximum = getattr(settings, "ATTENDANCE_SESSION_MAX_SECONDS", 10800)
        assert self._ttl(resp.json()["data"]["id"]) <= maximum + 2

    def test_start_flex_tolerates_garbage_duration(self, api_client, class_session, lecturer_user):
        offering = self._as_lecturer(api_client, class_session, lecturer_user)
        resp = api_client.post(
            "/api/v1/attendance/start-flex/",
            {"offering_id": str(offering.id), "duration_seconds": {"nested": "junk"}},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        default = getattr(settings, "ATTENDANCE_SESSION_DEFAULT_SECONDS", 60)
        assert abs(self._ttl(resp.json()["data"]["id"]) - default) < 2


@pytest.mark.django_db
class TestSelfRegisterValidation:
    def _payload(self, **overrides):
        payload = {
            "email": "newstudent@student.ubuea.cm",
            "password": "pass12345",
            "password_confirm": "pass12345",
            "first_name": "New",
            "last_name": "Student",
            "role": "STUDENT",
            "matricule": "FE26A123",
            "level": "300",
            "personal_email": "new.personal@gmail.com",
        }
        payload.update(overrides)
        return payload

    def test_duplicate_matricule_is_a_clean_400(self, api_client, student_user, cs_department):
        """student_user already owns STU001; a lower-case duplicate must 400."""
        resp = api_client.post(
            "/api/v1/auth/self-register/",
            self._payload(department=str(cs_department.id), matricule="stu001",
                          email="dupe@student.ubuea.cm"),
            format="json",
        )
        assert resp.status_code == 400
        assert not User.objects.filter(email="dupe@student.ubuea.cm").exists()

    def test_unknown_department_is_rejected(self, api_client):
        resp = api_client.post(
            "/api/v1/auth/self-register/",
            self._payload(department=str(uuid.uuid4()), email="nodep@student.ubuea.cm"),
            format="json",
        )
        assert resp.status_code == 400
        assert not User.objects.filter(email="nodep@student.ubuea.cm").exists()


@pytest.mark.django_db
class TestRosterMatriculeConflictsFailPerRow:
    def _upload(self, api_client, csv_text):
        return api_client.post(
            "/api/v1/admin/roster/upload/",
            {"file": SimpleUploadedFile("roster.csv", csv_text.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )

    def test_conflicting_rows_error_without_aborting_the_upload(self, api_client, cs_department):
        admin = _make_user("roster-admin@test.edu", role="SYSTEM_ADMIN")
        owner = _make_user("owner@test.edu")
        StudentProfile.objects.create(user=owner, student_number="FET20CS001", department=cs_department)
        existing = _make_user("nonum@test.edu")
        StudentProfile.objects.create(user=existing, department=cs_department)

        csv_text = (
            "matricule,first_name,last_name,email,level,department_code\n"
            "fet20cs001,No,Number,nonum@test.edu,300,CS\n"
            "FET20CS001,New,Too,new@test.edu,300,CS\n"
        )
        api_client.force_authenticate(user=admin)
        resp = self._upload(api_client, csv_text)
        assert resp.status_code == 201, resp.content
        data = resp.json()["data"]
        assert data["created_count"] == 0
        assert data["updated_count"] == 0
        assert data["error_count"] == 2
        # The owned matricule is untouched and no new account was created.
        assert StudentProfile.objects.get(user=owner).student_number == "FET20CS001"
        assert not StudentProfile.objects.get(user=existing).student_number
        assert not User.objects.filter(email="new@test.edu").exists()


@pytest.mark.django_db
class TestCourseOfferingDepartmentConsistency:
    def test_mismatch_between_course_and_offering_department_is_rejected(self, course, faculty, academic_period):
        other = Department.objects.create(code="EE", name="Electrical Engineering", faculty=faculty)
        offering = CourseOffering(course=course, semester=academic_period, department=other)
        with pytest.raises(ValidationError):
            offering.full_clean()

    def test_matching_department_passes_validation(self, course, cs_department, academic_period):
        offering = CourseOffering(course=course, semester=academic_period, department=cs_department)
        offering.full_clean()  # must not raise
