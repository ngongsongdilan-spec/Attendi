"""Co-teaching (a second optional lecturer) and cross-department offerings.

These cover the rules the admin panel relies on:
  * one lead lecturer is required, a co-lecturer is optional;
  * the co-lecturer actually gets the course on their panel and can manage it;
  * shared departments make an offering registrable by their students,
    without removing access for the primary department.
"""
import pytest

from apps.accounts.models import StudentProfile, User
from apps.academics.models import Department, Enrollment


@pytest.fixture
def system_admin(db):
    return User.objects.create_user(
        email="co.admin@test.edu", password="test1234", role="SYSTEM_ADMIN", is_staff=True,
    )


@pytest.fixture
def co_lecturer(db):
    return User.objects.create_user(
        email="co.lecturer@test.edu", password="test1234",
        first_name="Co", last_name="Lecturer", role="LECTURER",
    )


@pytest.fixture
def other_lecturer(db):
    return User.objects.create_user(
        email="other.lecturer@test.edu", password="test1234",
        first_name="Other", last_name="Lecturer", role="LECTURER",
    )


@pytest.fixture
def ee_department(faculty):
    return Department.objects.create(code="EE", name="Electrical Engineering", faculty=faculty)


@pytest.fixture
def ee_student(ee_department):
    user = User.objects.create_user(
        email="ee.student@test.edu", password="test1234",
        first_name="EE", last_name="Student", role="STUDENT",
    )
    StudentProfile.objects.create(
        user=user, student_number="EE001", department=ee_department, level="300",
    )
    return user


def _activate_semester(semester):
    semester.is_active = True
    semester.save(update_fields=["is_active"])


@pytest.mark.django_db
class TestCoLecturerAssignment:
    def test_admin_can_assign_co_lecturer(self, api_client, offering, system_admin, co_lecturer):
        api_client.force_authenticate(user=system_admin)
        response = api_client.patch(
            f"/api/v1/course-offerings/{offering.id}/",
            {"co_lecturer": str(co_lecturer.id)},
            format="json",
        )
        assert response.status_code == 200, response.content
        data = response.json()["data"]
        assert data["co_lecturer"] == str(co_lecturer.id)
        assert data["co_lecturer_name"] == "Co Lecturer"
        offering.refresh_from_db()
        assert offering.co_lecturer_id == co_lecturer.id

    def test_single_lecturer_without_co_lecturer_still_saves(
        self, api_client, offering, system_admin, lecturer_user
    ):
        api_client.force_authenticate(user=system_admin)
        response = api_client.patch(
            f"/api/v1/course-offerings/{offering.id}/",
            {"lecturer": str(lecturer_user.id)},
            format="json",
        )
        assert response.status_code == 200, response.content
        assert response.json()["data"]["lecturer"] == str(lecturer_user.id)
        assert response.json()["data"]["co_lecturer"] is None

    def test_same_person_cannot_be_both_lecturers(self, api_client, offering, system_admin, lecturer_user):
        api_client.force_authenticate(user=system_admin)
        response = api_client.patch(
            f"/api/v1/course-offerings/{offering.id}/",
            {"lecturer": str(lecturer_user.id), "co_lecturer": str(lecturer_user.id)},
            format="json",
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_co_lecturer_sees_the_offering_on_their_panel(
        self, api_client, offering, co_lecturer
    ):
        offering.co_lecturer = co_lecturer
        offering.save(update_fields=["co_lecturer"])
        api_client.force_authenticate(user=co_lecturer)
        response = api_client.get("/api/v1/lecturers/me/courses/")
        assert response.status_code == 200, response.content
        assert str(offering.id) in {row["offering_id"] for row in response.json()["data"]}

    def test_co_lecturer_can_manage_course_work(self, api_client, offering, co_lecturer, other_lecturer):
        offering.co_lecturer = co_lecturer
        offering.save(update_fields=["co_lecturer"])

        api_client.force_authenticate(user=co_lecturer)
        allowed = api_client.get(f"/api/v1/course-offerings/{offering.id}/assessments/")
        assert allowed.status_code == 200, allowed.content

        api_client.force_authenticate(user=other_lecturer)
        denied = api_client.get(f"/api/v1/course-offerings/{offering.id}/assessments/")
        assert denied.status_code == 403

    def test_co_lecturer_can_start_attendance(self, api_client, offering, class_def, class_session, co_lecturer):
        offering.co_lecturer = co_lecturer
        offering.save(update_fields=["co_lecturer"])
        api_client.force_authenticate(user=co_lecturer)
        response = api_client.post(
            f"/api/v1/class-sessions/{class_session.id}/attendance/", {}, format="json",
        )
        assert response.status_code == 201, response.content
        assert response.json()["data"]["lecturer"] == str(co_lecturer.id)


@pytest.mark.django_db
class TestSharedDepartments:
    def test_admin_can_share_an_offering_with_another_department(
        self, api_client, offering, system_admin, ee_department
    ):
        api_client.force_authenticate(user=system_admin)
        response = api_client.patch(
            f"/api/v1/course-offerings/{offering.id}/",
            {"departments": [str(ee_department.id)]},
            format="json",
        )
        assert response.status_code == 200, response.content
        data = response.json()["data"]
        assert [str(d) for d in data["departments"]] == [str(ee_department.id)]
        assert data["department_names"] == ["Electrical Engineering"]
        assert offering.departments.filter(id=ee_department.id).exists()
        # The primary department is untouched and still present.
        offering.refresh_from_db()
        assert offering.department_id == offering.course.department_id

    def test_unknown_department_is_rejected(self, api_client, offering, system_admin):
        api_client.force_authenticate(user=system_admin)
        response = api_client.patch(
            f"/api/v1/course-offerings/{offering.id}/",
            {"departments": ["00000000-0000-0000-0000-000000000000"]},
            format="json",
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_shared_department_student_can_see_and_register(
        self, api_client, offering, course, academic_period, ee_student, ee_department
    ):
        _activate_semester(academic_period)
        course.level = "300"
        course.save(update_fields=["level"])
        offering.departments.add(ee_department)

        api_client.force_authenticate(user=ee_student)
        available = api_client.get("/api/v1/students/me/available-courses/")
        assert available.status_code == 200, available.content
        codes = {row["course_code"] for row in available.json()["data"]["courses"]}
        assert course.code in codes

        register = api_client.post(
            "/api/v1/students/me/register/",
            {"offering_ids": [str(offering.id)]},
            format="json",
        )
        assert register.status_code == 201, register.content
        assert Enrollment.objects.filter(
            student=ee_student, course_offering=offering, status=Enrollment.Status.ACTIVE,
        ).exists()

    def test_other_department_student_is_not_leaked_into_the_offering(
        self, api_client, offering, course, academic_period, ee_student
    ):
        _activate_semester(academic_period)
        course.level = "300"
        course.save(update_fields=["level"])
        # No shared department was added, so the EE student must not see it.
        api_client.force_authenticate(user=ee_student)
        available = api_client.get("/api/v1/students/me/available-courses/")
        assert available.status_code == 200, available.content
        codes = {row["course_code"] for row in available.json()["data"]["courses"]}
        assert course.code not in codes

    def test_primary_department_student_still_sees_the_offering(
        self, api_client, offering, course, academic_period, student_user, ee_department
    ):
        _activate_semester(academic_period)
        course.level = "300"
        course.save(update_fields=["level"])
        profile = student_user.student_profile
        profile.level = "300"
        profile.save(update_fields=["level"])
        offering.departments.add(ee_department)

        api_client.force_authenticate(user=student_user)
        available = api_client.get("/api/v1/students/me/available-courses/")
        assert available.status_code == 200, available.content
        codes = {row["course_code"] for row in available.json()["data"]["courses"]}
        assert course.code in codes
