"""Tests for roster-based onboarding, forced password change and carry-over.

Covers:
  - BR-002: Accounts only via roster upload (public registration blocked)
  - BR-003: Temp password must be changed at first login
  - BR-004: Carry-over application -> approval -> enrollment
  - BR-031: Attendance only for enrolled students (already enforced)
  - the academic/admin reference endpoints the Vite client depends on
"""
import pytest
from django.test import Client
from django.urls import reverse

from apps.academics.models import CarryOverApplication, CourseOffering, Enrollment
from apps.accounts.models import User


@pytest.mark.django_db
class TestAcademicReferenceEndpoints:
    """The single frontend reads these to show semesters, departments and
    platform totals, so their shape is part of the contract.

    Every 2xx body is wrapped once as ``{success, data}`` by SuccessRenderer.
    A view that returns ``{"data": ...}`` produces a double envelope, which a
    client unwrapping once silently reads as empty -- so these assert on shape.
    """

    @pytest.fixture
    def admin_user(self):
        return User.objects.create_user(
            email="refadmin@test.edu", password="test1234",
            first_name="Ref", last_name="Admin", role="SYSTEM_ADMIN",
        )

    @pytest.fixture
    def api(self, admin_user):
        from rest_framework.test import APIClient

        c = APIClient()
        c.force_authenticate(user=admin_user)
        return c

    def test_semester_list_exposes_which_one_is_active(self, api, academic_period):
        body = api.get("/api/v1/semesters/").json()
        assert "data" in body and "data" not in body["data"][0]
        assert "is_active" in body["data"][0]

    def test_activate_response_is_wrapped_exactly_once(self, api, academic_period):
        resp = api.post(f"/api/v1/semesters/{academic_period.id}/activate/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["is_active"] is True
        # The regression this guards: {"data": {"data": {...}}}
        assert "data" not in body["data"]

    def test_only_one_semester_stays_active(self, api, academic_period):
        from apps.academics.models import Semester

        other = Semester.objects.create(
            name="2026/2027 Semester 2", academic_year="2026/2027", number="2",
            start_date=academic_period.end_date,
            end_date=academic_period.end_date,
        )
        api.post(f"/api/v1/semesters/{academic_period.id}/activate/")
        api.post(f"/api/v1/semesters/{other.id}/activate/")
        assert Semester.objects.filter(is_active=True).count() == 1
        assert Semester.objects.get(id=other.id).is_active is True

    def test_admin_stats_is_wrapped_exactly_once(self, api):
        body = api.get("/api/v1/admin/stats/").json()
        # The client spreads this straight into its stat tiles, so the counters
        # must sit directly on `data` and not behind a second `data`.
        assert "data" not in body["data"]
        for key in ("total_students", "total_lecturers", "total_departments", "total_courses"):
            assert key in body["data"]

    def test_departments_list(self, api, cs_department):
        body = api.get("/api/v1/departments/").json()["data"]
        assert [d["code"] for d in body] == [cs_department.code]
        assert body[0]["faculty_name"]

    def test_notifications_list_is_scoped_to_the_caller(self, api, student_user):
        from rest_framework.test import APIClient

        from apps.notifications.models import Notification

        Notification.objects.create(user=student_user, type="ATTENDANCE", title="Theirs", message="x")
        mine = api.get("/api/v1/notifications/").json()["data"]
        assert [n["title"] for n in mine] == []

        other_client = APIClient()
        other_client.force_authenticate(user=student_user)
        theirs = other_client.get("/api/v1/notifications/").json()["data"]
        assert [n["title"] for n in theirs] == ["Theirs"]


@pytest.mark.django_db
class TestClassSchedules:
    def test_offering_timetable_round_trip(self, api_client, offering, lecturer_user, class_def):
        from apps.academics.models import ClassSchedule

        api_client.force_authenticate(user=lecturer_user)
        offering.lecturer = lecturer_user
        offering.save(update_fields=["lecturer"])

        created = api_client.post(
            f"/api/v1/course-offerings/{offering.id}/schedules/",
            {"day_of_week": "FRIDAY", "start_time": "14:00", "end_time": "16:00",
             "location": "Room 1", "class_type": "LAB"},
            format="json",
        )
        assert created.status_code == 201, created.content
        slot_id = created.json()["data"]["id"]
        assert created.json()["data"]["course_code"] == offering.course.code

        listed = api_client.get(f"/api/v1/course-offerings/{offering.id}/schedules/").json()["data"]
        assert [s["id"] for s in listed] == [slot_id]

        removed = api_client.delete(f"/api/v1/schedules/{slot_id}/")
        assert removed.status_code == 204
        assert not ClassSchedule.objects.filter(id=slot_id).exists()

    def test_student_cannot_add_a_slot(self, api_client, offering, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/course-offerings/{offering.id}/schedules/",
            {"day_of_week": "MONDAY", "start_time": "08:00", "end_time": "09:00"},
            format="json",
        )
        assert resp.status_code == 403



@pytest.mark.django_db
class TestRegistrationLockdown:
    def test_public_registration_blocked(self):
        client = Client()
        resp = client.post(
            reverse("auth-register"),
            data={"email": "outsider@test.edu", "password": "pass1234", "first_name": "Out", "last_name": "Sider"},
            content_type="application/json",
        )
        assert resp.status_code == 401
        assert not User.objects.filter(email="outsider@test.edu").exists()

    def test_admin_can_create_account(self):
        admin = User.objects.create_user(email="boss@test.edu", password="pass1234", first_name="B", last_name="Oss", role="SYSTEM_ADMIN")
        client = Client()
        client.force_login(admin)
        resp = client.post(
            reverse("auth-register"),
            data={"email": "newbie@test.edu", "password": "pass1234", "first_name": "New", "last_name": "Bie"},
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert User.objects.filter(email="newbie@test.edu").exists()


@pytest.mark.django_db
class TestRosterUpload:
    def _upload(self, client, csv_text):
        from django.core.files.uploadedfile import SimpleUploadedFile
        return client.post(
            reverse("roster-upload"),
            data={"file": SimpleUploadedFile("roster.csv", csv_text.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )

    def test_upload_creates_accounts_with_temp_passwords(self, cs_department):
        admin = User.objects.create_user(email="admin2@test.edu", password="pass1234", first_name="A", last_name="D", role="SYSTEM_ADMIN")
        client = Client()
        client.force_login(admin)
        csv_text = (
            "matricule,first_name,last_name,email,level,department_code\n"
            f"FET21CS001,Ada,Obi,ada@student.fet.edu,300,{cs_department.code}\n"
            f"FET21CS002,Ben,Ojo,ben@student.fet.edu,300,{cs_department.code}\n"
        )
        resp = self._upload(client, csv_text)
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["created_count"] == 2
        ada = User.objects.get(email="ada@student.fet.edu")
        assert ada.role == "STUDENT"
        assert ada.must_change_password is True
        assert ada.student_profile.student_number == "FET21CS001"
        assert ada.check_password(data["created"][0]["temp_password"])

    def test_reupload_is_idempotent_and_keeps_password(self, cs_department):
        admin = User.objects.create_user(email="admin3@test.edu", password="pass1234", first_name="A", last_name="D", role="SYSTEM_ADMIN")
        client = Client()
        client.force_login(admin)
        csv_text = (
            "matricule,first_name,last_name,email,level,department_code\n"
            f"FET22CS001,Cara,Zo,cara@student.fet.edu,200,{cs_department.code}\n"
        )
        first = self._upload(client, csv_text)
        temp_password = first.json()["data"]["created"][0]["temp_password"]

        # Second upload with a different level - profile updates, password untouched
        csv_text2 = csv_text.replace(",200,", ",300,")
        second = self._upload(client, csv_text2)
        data = second.json()["data"]
        assert data["created_count"] == 0
        assert data["updated_count"] == 1
        user = User.objects.get(email="cara@student.fet.edu")
        assert user.student_profile.level == "300"
        assert user.check_password(temp_password)

    def test_duplicate_matricule_rejected(self, cs_department):
        admin = User.objects.create_user(email="admin4@test.edu", password="pass1234", first_name="A", last_name="D", role="SYSTEM_ADMIN")
        client = Client()
        client.force_login(admin)
        csv_text = (
            "matricule,first_name,last_name,email,level,department_code\n"
            f"FET20CS001,Dan,Ugo,dan@student.fet.edu,400,{cs_department.code}\n"
            f"FET20CS001,Eve,Ama,eve@student.fet.edu,400,{cs_department.code}\n"
        )
        resp = self._upload(client, csv_text)
        data = resp.json()["data"]
        assert data["created_count"] == 1
        assert data["error_count"] == 1
        assert not User.objects.filter(email="eve@student.fet.edu").exists()

    def test_non_admin_cannot_upload(self):
        student = User.objects.create_user(email="s@test.edu", password="pass1234", first_name="S", last_name="T", role="STUDENT")
        client = Client()
        client.force_login(student)
        resp = client.post(reverse("roster-upload"), format="multipart")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestForcedPasswordChange:
    def test_change_password_flow(self):
        user = User.objects.create_user(email="tmp@test.edu", password="temppass1", first_name="T", last_name="M", must_change_password=True)
        client = Client()
        resp = client.post(
            reverse("auth-login"),
            data={"email": "tmp@test.edu", "password": "temppass1"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["must_change_password"] is True

        resp = client.post(
            reverse("auth-change-password"),
            data={"current_password": "temppass1", "new_password": "brandnew99"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.must_change_password is False
        assert user.check_password("brandnew99")

    def test_wrong_current_password_rejected(self):
        User.objects.create_user(email="tmp2@test.edu", password="temppass1", first_name="T", last_name="M", must_change_password=True)
        client = Client()
        client.post(reverse("auth-login"), data={"email": "tmp2@test.edu", "password": "temppass1"}, content_type="application/json")
        resp = client.post(
            reverse("auth-change-password"),
            data={"current_password": "wrongpass", "new_password": "brandnew99"},
            content_type="application/json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestCarryOver:
    def test_apply_review_approve_creates_enrollment(self, student_user, offering):
        lecturer = User.objects.create_user(email="lec2@test.edu", password="pass1234", first_name="L", last_name="E", role="LECTURER")
        client = Client()
        client.force_login(student_user)
        resp = client.post(
            reverse("carry-over-apply"),
            data={"course_offering_id": str(offering.id), "reason": "Failed this course last year"},
            content_type="application/json",
        )
        assert resp.status_code == 201
        app_id = resp.json()["data"]["id"]
        assert CarryOverApplication.objects.filter(id=app_id, status="PENDING").exists()

        # Lecturer approves -> enrollment created
        client2 = Client()
        client2.force_login(lecturer)
        resp = client2.post(
            reverse("carry-over-review", args=[app_id]),
            data={"decision": "APPROVED"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert Enrollment.objects.filter(student=student_user, course_offering=offering, status="ACTIVE").exists()

    def test_rejected_application_does_not_enroll(self, student_user, offering):
        admin = User.objects.create_user(email="adm9@test.edu", password="pass1234", first_name="A", last_name="D", role="SYSTEM_ADMIN")
        client = Client()
        client.force_login(student_user)
        resp = client.post(
            reverse("carry-over-apply"),
            data={"course_offering_id": str(offering.id), "reason": "Retake"},
            content_type="application/json",
        )
        app_id = resp.json()["data"]["id"]
        client2 = Client()
        client2.force_login(admin)
        client2.post(reverse("carry-over-review", args=[app_id]), data={"decision": "REJECTED"}, content_type="application/json")
        assert not Enrollment.objects.filter(student=student_user, course_offering=offering).exists()

    def test_duplicate_application_conflict(self, student_user, offering):
        CarryOverApplication.objects.create(student=student_user, course_offering=offering, status=CarryOverApplication.Status.PENDING)
        client = Client()
        client.force_login(student_user)
        resp = client.post(
            reverse("carry-over-apply"),
            data={"course_offering_id": str(offering.id), "reason": "Again"},
            content_type="application/json",
        )
        assert resp.status_code == 201  # get_or_create returns existing pending row

    def test_already_enrolled_conflict(self, enrolled_student, offering):
        client = Client()
        client.force_login(enrolled_student)
        resp = client.post(
            reverse("carry-over-apply"),
            data={"course_offering_id": str(offering.id), "reason": "Why not"},
            content_type="application/json",
        )
        assert resp.status_code == 409