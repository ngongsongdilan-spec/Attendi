"""A verified station scan hands the student their own QR immediately."""
import pytest

from apps.academics.models import Enrollment
from apps.attendance.models import AttendanceCheckpoint, AttendanceRecord, PointsLedger


@pytest.mark.django_db
@pytest.mark.parametrize("version", [1, 2])
def test_station_scan_returns_own_qr_and_promotes_each_student(
    api_client, offering, lecturer_user, student_user, student2_user, version,
):
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])
    for student in (student_user, student2_user):
        Enrollment.objects.create(student=student, course_offering=offering)

    api_client.force_authenticate(user=lecturer_user)
    started = api_client.post("/api/v1/attendance/start-flex/", {
        "offering_id": str(offering.id), "mode": "STATIONS", "duration_seconds": 300,
    }, format="json")
    assert started.status_code == 201, started.content
    session_id = started.json()["data"]["id"]
    suffix = "?token_version=2" if version == 2 else ""
    first_token = api_client.post(f"/api/v1/attendance/{session_id}/tokens/{suffix}").json()["data"]["tokens"][0]["token"]

    api_client.force_authenticate(user=student_user)
    first = api_client.post("/api/v1/attendance/scan/", {"token": first_token}, format="json")
    assert first.status_code == 201, first.content
    station = first.json()["data"]["station_qr"]
    assert station["selection_method"] == "SCAN"
    assert station["token"]
    assert station["attendance_session_id"] == session_id
    assert PointsLedger.objects.get(student=student_user, attendance_session_id=session_id).category == "SCAN"
    assert api_client.get("/api/v1/students/me/station/").json()["data"]["checkpoint_id"] == station["checkpoint_id"]

    api_client.force_authenticate(user=student2_user)
    second = api_client.post("/api/v1/attendance/scan/", {"token": station["token"]}, format="json")
    assert second.status_code == 201, second.content
    assert second.json()["data"]["station_qr"]["checkpoint_id"] != station["checkpoint_id"]
    assert PointsLedger.objects.get(student=student_user, attendance_session_id=session_id).category == "AUTO_STATION"
    assert AttendanceCheckpoint.objects.filter(attendance_session_id=session_id, selection_method="SCAN").count() == 2
    assert AttendanceRecord.objects.filter(attendance_session_id=session_id).count() == 2
    api_client.force_authenticate(user=lecturer_user)
    lecturer_tokens = api_client.post(f"/api/v1/attendance/{session_id}/tokens/{suffix}")
    assert lecturer_tokens.status_code == 200, lecturer_tokens.content
    assert lecturer_tokens.json()["data"]["tokens"][0]["checkpoint_id"] is None
    api_client.force_authenticate(user=student2_user)
    own_token = api_client.get(f"/api/v1/attendance/{session_id}/my-station-token/")
    assert own_token.status_code == 200, own_token.content
    assert own_token.json()["data"]["token"]

    duplicate = api_client.post("/api/v1/attendance/scan/", {"token": second.json()["data"]["station_qr"]["token"]}, format="json")
    assert duplicate.status_code == 409
    assert AttendanceCheckpoint.objects.filter(attendance_session_id=session_id).count() == 2


@pytest.mark.django_db
def test_projector_scan_records_attendance_without_station(api_client, offering, lecturer_user, enrolled_student):
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])
    api_client.force_authenticate(user=lecturer_user)
    started = api_client.post("/api/v1/attendance/start-flex/", {
        "offering_id": str(offering.id), "mode": "PROJECTOR", "duration_seconds": 300,
    }, format="json")
    session_id = started.json()["data"]["id"]
    token = api_client.post(f"/api/v1/attendance/{session_id}/tokens/").json()["data"]["tokens"][0]["token"]
    api_client.force_authenticate(user=enrolled_student)
    scan = api_client.post("/api/v1/attendance/scan/", {"token": token}, format="json")
    assert scan.status_code == 201, scan.content
    assert "station_qr" not in scan.json()["data"]
    assert not AttendanceCheckpoint.objects.filter(attendance_session_id=session_id).exists()
