"""Shared pytest fixtures for the FET Platform test suite."""
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import StudentProfile, User
from apps.academics.models import (
    Semester,
    ClassDefinition,
    ClassSession,
    Course,
    CourseOffering,
    Department,
    Enrollment,
    Faculty,
)


@pytest.fixture
def faculty(db):
    return Faculty.objects.create(code="FET", name="Faculty of Engineering and Technology")


@pytest.fixture
def cs_department(faculty):
    return Department.objects.create(code="CS", name="Computer Science", faculty=faculty)


@pytest.fixture
def academic_period(db):
    now = timezone.now().date()
    return Semester.objects.create(
        name="2026/2027 Semester 1",
        academic_year="2026/2027",
        number="1",
        start_date=now - timedelta(days=7),
        end_date=now + timedelta(days=120),
    )


@pytest.fixture
def course(cs_department):
    return Course.objects.create(code="CSC301", title="Database Systems", department=cs_department, credit_units=3)


@pytest.fixture
def offering(course, academic_period, cs_department):
    return CourseOffering.objects.create(course=course, semester=academic_period, department=cs_department)


@pytest.fixture
def lecturer_user(db):
    user = User.objects.create_user(
        email="lecturer@test.edu", password="test1234", first_name="Test", last_name="Lecturer", role="LECTURER"
    )
    return user


@pytest.fixture
def student_user(cs_department):
    user = User.objects.create_user(
        email="student@test.edu", password="test1234", first_name="Test", last_name="Student", role="STUDENT"
    )
    StudentProfile.objects.create(user=user, student_number="STU001", department=cs_department)
    return user


@pytest.fixture
def student2_user(cs_department):
    user = User.objects.create_user(
        email="student2@test.edu", password="test1234", first_name="Test2", last_name="Student2", role="STUDENT"
    )
    StudentProfile.objects.create(user=user, student_number="STU002", department=cs_department)
    return user


@pytest.fixture
def enrolled_student(student_user, offering):
    Enrollment.objects.create(student=student_user, course_offering=offering, status=Enrollment.Status.ACTIVE)
    return student_user


@pytest.fixture
def class_def(offering, lecturer_user):
    return ClassDefinition.objects.create(
        course_offering=offering, lecturer=lecturer_user, name="CSC301 Lecture", class_type="LECTURE", location="Room 204"
    )


@pytest.fixture
def class_session(class_def):
    now = timezone.now()
    return ClassSession.objects.create(
        class_definition=class_def, starts_at=now + timedelta(minutes=30), ends_at=now + timedelta(hours=2), status="SCHEDULED"
    )


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()
