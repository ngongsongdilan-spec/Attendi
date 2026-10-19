"""End-to-end flow for a live attendance test.

Admin assigns a lecturer to a course offering, that lecturer starts a flex
attendance session, and an enrolled student scans the projector token. This is
the exact path exercised manually in a classroom test.
"""
import pytest
from django.core.cache import cache
from django.utils import timezone

from apps.accounts.models import User
from apps.attendance.models import AttendanceRecord, AttendanceSession
from apps.academics.models import CourseOffering, Enrollment, Semester


@pytest.fixture
def system_admin(db):
    return User.objects.create_user(
        email="e2e.admin@test.edu",
        password="test1234",
        first_name="Sys",
        last_name="Admin",
        role="SYSTEM_ADMIN",
        is_staff=True,
    )


@pytest.mark.django_db
def test_assign_lecturer_then_run_attendance_end_to_end(
    api_client, offering, lecturer_user, enrolled_student, system_admin, academic_period
):
    # 1. The active semester is what the lecturer's course list reads.
    academic_period.is_active = True
    academic_period.save()

    # 2. Admin assigns the lecturer to the offering.
    api_client.force_authenticate(user=system_admin)
    resp = api_client.patch(
        f"/api/v1/course-offerings/{offering.id}/",
        {"lecturer": str(lecturer_user.id)},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    assert resp.json()["data"]["lecturer"] == str(lecturer_user.id)

    # 3. The lecturer now sees the course in their attendance dropdown.
    api_client.force_authenticate(user=lecturer_user)
    resp = api_client.get("/api/v1/lecturers/me/courses/")
    assert resp.status_code == 200, resp.content
    courses = resp.json()["data"]
    assert any(c["offering_id"] == str(offering.id) for c in courses), courses

    # 4. The lecturer starts a projector session.
    resp = api_client.post(
        "/api/v1/attendance/start-flex/",
        {"offering_id": str(offering.id), "mode": "PROJECTOR", "duration_seconds": 300},
        format="json",
    )
    assert resp.status_code == 201, resp.content
    session_id = resp.json()["data"]["id"]

    # 5. The lecturer pulls a projector token and the student scans it.
    resp = api_client.post(f"/api/v1/attendance/{session_id}/tokens/")
    assert resp.status_code == 200, resp.content
    token = resp.json()["data"]["tokens"][0]["token"]
    assert token

    api_client.force_authenticate(user=enrolled_student)
    resp = api_client.post("/api/v1/attendance/scan/", {"token": token}, format="json")
    assert resp.status_code == 201, resp.content
    assert resp.json()["success"] is True

    # 6. The attendance record is persisted against the session.
    session = AttendanceSession.objects.get(id=session_id)
    assert AttendanceRecord.objects.filter(
        attendance_session=session, student=enrolled_student, verification_method="QR_SCAN"
    ).exists()


@pytest.mark.django_db
def test_unassigned_lecturer_cannot_start_attendance(api_client, offering, lecturer_user):
    """A lecturer who is not the offering's lecturer is rejected (no silent access)."""
    api_client.force_authenticate(user=lecturer_user)
    resp = api_client.post(
        "/api/v1/attendance/start-flex/",
        {"offering_id": str(offering.id), "mode": "PROJECTOR"},
        format="json",
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_assigning_lecturer_does_not_reuse_a_stale_class_definition(
    api_client, offering, class_def, lecturer_user, enrolled_student, db
):
    """If a ClassDefinition already exists with another lecturer, reassigning the
    offering must still let the NEW lecturer start and own the session."""
    old_lecturer = class_def.lecturer
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])

    api_client.force_authenticate(user=lecturer_user)
    resp = api_client.post(
        "/api/v1/attendance/start-flex/",
        {"offering_id": str(offering.id), "mode": "PROJECTOR", "duration_seconds": 300},
        format="json",
    )
    assert resp.status_code == 201, resp.content
    session = AttendanceSession.objects.get(id=resp.json()["data"]["id"])
    assert session.lecturer_id == lecturer_user.id

    # The roster (used by the station picker) is visible to the new lecturer.
    resp = api_client.get(
        f"/api/v1/class-sessions/{session.class_session_id}/eligible-students/"
    )
    assert resp.status_code == 200, resp.content
    assert len(resp.json()["data"]) == 1
