"""Tests for core business rules.

Covers:
  - BR-001: Unique user accounts
  - FR-001/002: Course enrollment + automatic class membership
  - BR-015: Historical academic records preserved on drop
  - Enrollment uniqueness constraint
"""
import pytest
from django.db import IntegrityError

from apps.accounts.models import StudentProfile, User
from apps.academics.models import Enrollment, Semester
from apps.projects.models import Project, ProjectMember


@pytest.mark.django_db
class TestUserUniqueness:
    def test_unique_email(self):
        User.objects.create_user(email="dup@test.edu", password="test1234", first_name="A", last_name="B")
        with pytest.raises(IntegrityError):
            User.objects.create_user(email="dup@test.edu", password="test1234", first_name="C", last_name="D")

    def test_email_case_insensitive(self):
        User.objects.create_user(email="Case@Test.edu", password="test1234", first_name="A", last_name="B")
        with pytest.raises(IntegrityError):
            User.objects.create_user(email="case@test.edu", password="test1234", first_name="C", last_name="D")


@pytest.mark.django_db
class TestEnrollment:
    def test_enroll_student_in_offering(self, enrolled_student, offering):
        assert Enrollment.objects.filter(student=enrolled_student, course_offering=offering, status="ACTIVE").exists()

    def test_enrollment_uniqueness_constraint(self, enrolled_student, offering):
        with pytest.raises(IntegrityError):
            Enrollment.objects.create(student=enrolled_student, course_offering=offering, status="ACTIVE")

    def test_drop_preserves_record(self, enrolled_student, offering):
        enrollment = Enrollment.objects.get(student=enrolled_student, course_offering=offering)
        enrollment.status = Enrollment.Status.DROPPED
        enrollment.save(update_fields=["status"])
        assert Enrollment.objects.filter(student=enrolled_student, course_offering=offering, status="DROPPED").exists()

    def test_student_eligible_for_class_through_enrollment(self, enrolled_student, class_def):
        """BR-011: Automatic class membership from course enrollment."""
        offering = class_def.course_offering
        eligible_ids = set(
            offering.enrollments.filter(status="ACTIVE").values_list("student_id", flat=True)
        )
        assert enrolled_student.id in eligible_ids

    def test_non_enrolled_student_not_eligible(self, student2_user, class_def):
        offering = class_def.course_offering
        eligible_ids = set(
            offering.enrollments.filter(status="ACTIVE").values_list("student_id", flat=True)
        )
        assert student2_user.id not in eligible_ids

    def test_late_registration_adds_student_to_existing_individual_project(
        self, api_client, offering, academic_period, course, student_user, lecturer_user
    ):
        academic_period.is_active = True
        academic_period.save(update_fields=["is_active"])
        course.level = "300"
        course.save(update_fields=["level"])
        profile = student_user.student_profile
        profile.level = "300"
        profile.save(update_fields=["level"])
        project = Project.objects.create(
            course_offering=offering,
            created_by=lecturer_user,
            supervisor=lecturer_user,
            title="Existing individual project",
            scope=Project.Scope.INDIVIDUAL,
        )

        api_client.force_authenticate(user=student_user)
        response = api_client.post(
            "/api/v1/students/me/register/",
            {"offering_ids": [str(offering.id)]},
            format="json",
        )

        assert response.status_code == 201, response.content
        assert ProjectMember.objects.filter(project=project, student=student_user).exists()

    def test_registration_reactivates_dropped_enrollment(self, api_client, offering, academic_period, course, student_user):
        academic_period.is_active = True
        academic_period.save(update_fields=["is_active"])
        course.level = "300"
        course.save(update_fields=["level"])
        profile = student_user.student_profile
        profile.level = "300"
        profile.save(update_fields=["level"])
        enrollment = Enrollment.objects.create(
            student=student_user,
            course_offering=offering,
            status=Enrollment.Status.DROPPED,
        )
        api_client.force_authenticate(user=student_user)

        response = api_client.post(
            "/api/v1/students/me/register/",
            {"offering_ids": [str(offering.id)]},
            format="json",
        )

        assert response.status_code == 201, response.content
        enrollment.refresh_from_db()
        assert enrollment.status == Enrollment.Status.ACTIVE
        assert enrollment.dropped_at is None
