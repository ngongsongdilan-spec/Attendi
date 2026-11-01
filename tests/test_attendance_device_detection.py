"""Shared-device detection, grouping, verification and audit tests."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import StudentProfile, User
from apps.academics.models import Enrollment
from apps.attendance.models import (
    AttendanceDeviceGroup, AttendanceRecord, AttendanceSession,
)
from apps.attendance.token_store import generate_hmac_token, generate_session_token
from apps.audit.models import AuditLog


def make_session(class_session, lecturer_user, *, seconds=300):
    now = timezone.now()
    return AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer_user,
        started_at=now - timedelta(seconds=1), expires_at=now + timedelta(seconds=seconds),
    )


def make_student(cs_department, offering, *, email, number, first, last):
    user = User.objects.create_user(
        email=email, password="test1234", first_name=first, last_name=last, role="STUDENT",
    )
    StudentProfile.objects.create(user=user, student_number=number, department=cs_department)
    Enrollment.objects.create(
        student=user, course_offering=offering, status=Enrollment.Status.ACTIVE,
    )
    return user


def register(api_client, user):
    api_client.force_authenticate(user=user)
    response = api_client.post("/api/v1/devices/register/", {}, format="json")
    assert response.status_code == 201, response.content
    data = response.json()["data"]
    assert data["device_credential"]
    return data


def scan(api_client, user, session, device):
    api_client.force_authenticate(user=user)
    token = generate_session_token(session)["token"]
    response = api_client.post(
        "/api/v1/attendance/scan/",
        {
            "token": token,
            "device_id": device["device_id"],
            "device_credential": device["device_credential"],
        },
        format="json",
    )
    return response


@pytest.mark.django_db
class TestDeviceRegistration:
    def test_register_issues_and_verifies_same_identity(self, api_client, enrolled_student):
        first = register(api_client, enrolled_student)
        assert first["created"] is True
        assert first["verified"] is False

        response = api_client.post(
            "/api/v1/devices/register/",
            {"device_id": first["device_id"], "device_credential": first["device_credential"]},
            format="json",
        )
        assert response.status_code == 200
        again = response.json()["data"]
        assert again["device_id"] == first["device_id"]
        assert again["device_credential"] == first["device_credential"]
        assert again["created"] is False
        assert again["verified"] is True
        assert response["Cache-Control"] == "private, no-store"

    def test_bad_credential_replaces_instead_of_trusting_id(self, api_client, enrolled_student):
        first = register(api_client, enrolled_student)
        response = api_client.post(
            "/api/v1/devices/register/",
            {"device_id": first["device_id"], "device_credential": "not-the-secret"},
            format="json",
        )
        assert response.status_code == 201
        replacement = response.json()["data"]
        assert replacement["device_id"] != first["device_id"]
        assert replacement["replaced"] is True

    def test_registration_requires_authentication(self, api_client):
        response = api_client.post("/api/v1/devices/register/", {}, format="json")
        assert response.status_code in (401, 403)


@pytest.mark.django_db
class TestSharedDeviceGrouping:
    def test_two_accounts_on_one_device_are_grouped_for_review(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE,
        )
        session = make_session(class_session, lecturer_user)
        device = register(api_client, enrolled_student)

        assert scan(api_client, enrolled_student, session, device).status_code == 201
        group = AttendanceDeviceGroup.objects.get(attendance_session=session)
        assert group.student_count == 1
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.NORMAL

        assert scan(api_client, student2_user, session, device).status_code == 201
        group.refresh_from_db()
        assert group.student_count == 2
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED
        assert group.version == 3
        assert AuditLog.objects.filter(
            action="ATTENDANCE_SHARED_DEVICE_DETECTED", resource_id=session.id,
        ).exists()

        # Individual records remain independent.
        records = AttendanceRecord.objects.filter(device_group=group)
        assert records.count() == 2
        assert set(records.values_list("student_id", flat=True)) == {
            enrolled_student.id, student2_user.id,
        }

    def test_three_accounts_increase_the_adaptive_count(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, cs_department, offering,
    ):
        third = make_student(
            cs_department, offering, email="third@test.edu", number="STU003",
            first="Third", last="Student",
        )
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE,
        )
        session = make_session(class_session, lecturer_user)
        device = register(api_client, enrolled_student)
        for student in (enrolled_student, student2_user, third):
            assert scan(api_client, student, session, device).status_code == 201

        group = AttendanceDeviceGroup.objects.get(attendance_session=session)
        assert group.student_count == 3
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED

    def test_different_devices_stay_normal_and_separate(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE,
        )
        session = make_session(class_session, lecturer_user)
        first_device = register(api_client, enrolled_student)
        second_device = register(api_client, student2_user)
        assert scan(api_client, enrolled_student, session, first_device).status_code == 201
        assert scan(api_client, student2_user, session, second_device).status_code == 201

        groups = AttendanceDeviceGroup.objects.filter(attendance_session=session)
        assert groups.count() == 2
        assert set(groups.values_list("integrity_status", flat=True)) == {
            AttendanceDeviceGroup.IntegrityStatus.NORMAL,
        }

    def test_invalid_device_credential_never_groups(
        self, api_client, class_session, lecturer_user, enrolled_student,
    ):
        session = make_session(class_session, lecturer_user)
        api_client.force_authenticate(user=enrolled_student)
        token = generate_session_token(session)["token"]
        response = api_client.post(
            "/api/v1/attendance/scan/",
            {"token": token, "device_id": "00000000-0000-0000-0000-000000000001",
             "device_credential": "wrong"},
            format="json",
        )
        assert response.status_code == 201
        record = AttendanceRecord.objects.get(attendance_session=session)
        assert record.device_id is None
        assert record.device_group_id is None

    def test_offline_sync_attaches_device(
        self, api_client, class_session, lecturer_user, enrolled_student,
    ):
        session = make_session(class_session, lecturer_user)
        device = register(api_client, enrolled_student)
        token = generate_hmac_token(session, slot_index=0)
        api_client.force_authenticate(user=enrolled_student)
        response = api_client.post(
            "/api/v1/attendance/offline-sync/",
            {
                "session_id": str(session.id),
                "device_id": device["device_id"],
                "device_credential": device["device_credential"],
                "captures": [{"token": token}],
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["data"]["results"][0]["status"] == "ACCEPTED"
        record = AttendanceRecord.objects.get(attendance_session=session)
        assert str(record.device_id) == device["device_id"]
        assert record.device_group is not None


@pytest.mark.django_db
class TestVerification:
    def _shared_group(self, api_client, class_session, lecturer_user, enrolled_student,
                      student2_user, offering):
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE,
        )
        session = make_session(class_session, lecturer_user)
        device = register(api_client, enrolled_student)
        for student in (enrolled_student, student2_user):
            assert scan(api_client, student, session, device).status_code == 201
        return session, AttendanceDeviceGroup.objects.get(attendance_session=session)

    def test_lecturer_verifies_students_independently(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session, group = self._shared_group(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        api_client.force_authenticate(user=lecturer_user)
        url = (
            f"/api/v1/attendance/{session.id}/integrity/groups/{group.id}"
            f"/students/{enrolled_student.id}/"
        )
        first = api_client.patch(url, {"status": "PRESENT", "reason": "seen in class"}, format="json")
        assert first.status_code == 200, first.content
        assert first.json()["data"]["record"]["status"] == "PRESENT"
        assert first.json()["data"]["group"]["integrity_status"] == "REVIEW_REQUIRED"

        second_url = url.replace(str(enrolled_student.id), str(student2_user.id))
        second = api_client.patch(second_url, {"status": "ABSENT"}, format="json")
        assert second.status_code == 200, second.content
        data = second.json()["data"]
        assert data["record"]["status"] == "ABSENT"
        assert data["group"]["integrity_status"] == "REVIEWED"
        assert data["group"]["verified_count"] == 2

        assert AttendanceRecord.objects.get(
            attendance_session=session, student=enrolled_student,
        ).status == "PRESENT"
        assert AttendanceRecord.objects.get(
            attendance_session=session, student=student2_user,
        ).status == "ABSENT"
        assert AuditLog.objects.filter(action="ATTENDANCE_VERIFIED", resource_id=session.id).count() == 2

    def test_verification_is_lecturer_only(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session, group = self._shared_group(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        url = (
            f"/api/v1/attendance/{session.id}/integrity/groups/{group.id}"
            f"/students/{enrolled_student.id}/"
        )
        api_client.force_authenticate(user=enrolled_student)
        assert api_client.patch(url, {"status": "ABSENT"}, format="json").status_code == 403

        stranger = User.objects.create_user(
            email="other.lect@test.edu", password="test1234",
            first_name="Other", last_name="Lecturer", role="LECTURER",
        )
        api_client.force_authenticate(user=stranger)
        assert api_client.patch(url, {"status": "ABSENT"}, format="json").status_code == 403

    def test_general_correction_also_marks_integrity_review(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session, group = self._shared_group(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        record = AttendanceRecord.objects.get(
            attendance_session=session, student=enrolled_student,
        )
        api_client.force_authenticate(user=lecturer_user)
        response = api_client.patch(
            f"/api/v1/attendance/records/{record.id}/", {"status": "ABSENT"}, format="json",
        )
        assert response.status_code == 200
        record.refresh_from_db()
        group.refresh_from_db()
        assert record.integrity_verified_at is not None
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED

    def test_deleting_a_record_recomputes_the_group(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session, group = self._shared_group(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        record = AttendanceRecord.objects.get(
            attendance_session=session, student=student2_user,
        )
        api_client.force_authenticate(user=lecturer_user)
        response = api_client.delete(f"/api/v1/attendance/records/{record.id}/")
        assert response.status_code == 204
        group.refresh_from_db()
        assert group.student_count == 1
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.NORMAL


@pytest.mark.django_db
class TestLecturerReadModels:
    def _shared(self, api_client, class_session, lecturer_user, enrolled_student,
                student2_user, offering):
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE,
        )
        session = make_session(class_session, lecturer_user)
        device = register(api_client, enrolled_student)
        for student in (enrolled_student, student2_user):
            assert scan(api_client, student, session, device).status_code == 201
        return session

    def test_integrity_endpoint_returns_backend_groups(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session = self._shared(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        api_client.force_authenticate(user=lecturer_user)
        response = api_client.get(f"/api/v1/attendance/{session.id}/integrity/")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["integrity_summary"]["shared_groups"] == 1
        assert data["integrity_summary"]["review_required"] == 1
        assert data["integrity_summary"]["pending_students"] == 2
        group = data["groups"][0]
        assert group["student_count"] == 2
        assert len(group["students"]) == 2
        assert all(student["student_number"] for student in group["students"])
        assert response["Cache-Control"] == "private, no-store"

    def test_session_detail_exposes_groups_and_record_flags(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session = self._shared(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        api_client.force_authenticate(user=lecturer_user)
        response = api_client.get(f"/api/v1/attendance/{session.id}/records/")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["integrity_summary"]["review_required"] == 1
        assert len(data["groups"]) == 1
        assert len(data["records"]) == 2
        assert all(record["verification_required"] for record in data["records"])
        assert all(record["device_id"] for record in data["records"])

    def test_audit_endpoint_lists_device_and_verification_events(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session = self._shared(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        group = AttendanceDeviceGroup.objects.get(attendance_session=session)
        api_client.force_authenticate(user=lecturer_user)
        api_client.patch(
            f"/api/v1/attendance/{session.id}/integrity/groups/{group.id}"
            f"/students/{enrolled_student.id}/",
            {"status": "PRESENT"}, format="json",
        )
        response = api_client.get(f"/api/v1/attendance/{session.id}/audit/")
        assert response.status_code == 200
        actions = {event["action"] for event in response.json()["data"]}
        assert "ATTENDANCE_SHARED_DEVICE_DETECTED" in actions
        assert "ATTENDANCE_VERIFIED" in actions

    def test_students_cannot_read_integrity_or_audit(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, offering,
    ):
        session = self._shared(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        api_client.force_authenticate(user=enrolled_student)
        assert api_client.get(f"/api/v1/attendance/{session.id}/integrity/").status_code == 403
        assert api_client.get(f"/api/v1/attendance/{session.id}/audit/").status_code == 403

    def test_filtering_integrity_groups_by_shared_and_status(
        self, api_client, class_session, lecturer_user, enrolled_student,
        student2_user, cs_department, offering,
    ):
        session = self._shared(
            api_client, class_session, lecturer_user, enrolled_student, student2_user, offering,
        )
        solo_student = make_student(
            cs_department, offering, email="solo@test.edu", number="STU-SOLO",
            first="Solo", last="Student",
        )
        solo_device = register(api_client, solo_student)
        assert scan(api_client, solo_student, session, solo_device).status_code == 201

        api_client.force_authenticate(user=lecturer_user)

        # Filter shared=true
        resp_shared = api_client.get(f"/api/v1/attendance/{session.id}/integrity/?shared=true")
        assert resp_shared.status_code == 200
        shared_groups = resp_shared.json()["data"]["groups"]
        assert len(shared_groups) == 1
        assert shared_groups[0]["student_count"] == 2

        # Filter status=NORMAL
        resp_normal = api_client.get(f"/api/v1/attendance/{session.id}/integrity/?status=NORMAL")
        assert resp_normal.status_code == 200
        normal_groups = resp_normal.json()["data"]["groups"]
        assert len(normal_groups) == 1
        assert normal_groups[0]["student_count"] == 1


@pytest.mark.django_db(transaction=True)
class TestScaleAndConcurrency:
    def test_thirty_accounts_on_one_device_scale_and_verify(
        self, api_client, class_session, lecturer_user, enrolled_student,
        cs_department, offering,
    ):
        session = make_session(class_session, lecturer_user)
        device = register(api_client, enrolled_student)

        students = [enrolled_student]
        for i in range(2, 31):
            s = make_student(
                cs_department, offering, email=f"student{i:02d}@test.edu",
                number=f"FE21A{i:03d}", first=f"Student{i}", last="Test",
            )
            students.append(s)

        for s in students:
            res = scan(api_client, s, session, device)
            assert res.status_code == 201

        group = AttendanceDeviceGroup.objects.get(attendance_session=session)
        assert group.student_count == 30
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED

        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/attendance/{session.id}/integrity/")
        data = resp.json()["data"]
        assert data["integrity_summary"]["shared_groups"] == 1
        assert data["integrity_summary"]["pending_students"] == 30
        grp_data = data["groups"][0]
        assert grp_data["verification_required_count"] == 30
        assert grp_data["verified_count"] == 0
        assert len(grp_data["students"]) == 30

        # Lecturer verifies 10 students
        for s in students[:10]:
            patch_resp = api_client.patch(
                f"/api/v1/attendance/{session.id}/integrity/groups/{group.id}/students/{s.id}/",
                {"status": "PRESENT"}, format="json",
            )
            assert patch_resp.status_code == 200

        group.refresh_from_db()
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED

        resp = api_client.get(f"/api/v1/attendance/{session.id}/integrity/")
        grp_data = resp.json()["data"]["groups"][0]
        assert grp_data["verified_count"] == 10
        assert grp_data["verification_required_count"] == 20

        # Lecturer verifies remaining 20 students
        for s in students[10:]:
            patch_resp = api_client.patch(
                f"/api/v1/attendance/{session.id}/integrity/groups/{group.id}/students/{s.id}/",
                {"status": "ABSENT"}, format="json",
            )
            assert patch_resp.status_code == 200

        group.refresh_from_db()
        assert group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEWED
        assert group.reviewed_at is not None

        resp = api_client.get(f"/api/v1/attendance/{session.id}/integrity/")
        summary = resp.json()["data"]["integrity_summary"]
        assert summary["review_required"] == 0
        assert summary["reviewed"] == 1
        assert summary["pending_students"] == 0
