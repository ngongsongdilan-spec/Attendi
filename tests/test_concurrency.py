"""Race-condition & integrity tests for the concurrency hardening pass.

Two layers:

* DB-constraint / idempotency tests that run everywhere (in-memory SQLite in
  the default suite). These lock in the *guarantees* (partial unique index,
  unique rows, idempotent awards, submission caps).
* Genuine multi-threaded tests that exercise ``SELECT ... FOR UPDATE``. Row
  locking is a no-op on SQLite and in-memory SQLite is not shared across
  threads, so those are skipped unless the suite is pointed at PostgreSQL.
"""
import threading
from datetime import timedelta

import pytest
from django.db import IntegrityError, connection, connections, transaction
from django.utils import timezone

from apps.academics.models import (
    Course,
    CourseOffering,
    Department,
    Enrollment,
    Faculty,
    Semester,
)
from apps.accounts.models import StudentProfile, User
from apps.attendance.models import AttendanceRecord, AttendanceSession, PointsLedger
from apps.attendance.points import award_manual_points, award_scan_points, award_student_of_class
from apps.learning.models import Assignment, AssignmentSubmission


def _is_postgres():
    return connection.vendor == "postgresql"


# ---------------------------------------------------------------------------
# DB constraints (portable)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestDatabaseConstraints:
    def test_only_one_active_semester_constraint(self, academic_period, db):
        other = Semester.objects.create(
            name="2027/2028 Semester 1",
            academic_year="2027/2028",
            number="1",
            start_date=academic_period.start_date,
            end_date=academic_period.end_date,
        )
        # Bypass Model.save() (which demotes) to hit the partial unique index
        # directly: two active rows in one statement must be rejected by the DB.
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Semester.objects.filter(pk__in=[academic_period.pk, other.pk]).update(is_active=True)

    def test_saving_active_semester_demotes_previous(self, academic_period):
        academic_period.is_active = True
        academic_period.save()
        other = Semester.objects.create(
            name="2027/2028 Semester 1",
            academic_year="2027/2028",
            number="1",
            start_date=academic_period.start_date,
            end_date=academic_period.end_date,
            is_active=True,
        )
        academic_period.refresh_from_db()
        assert academic_period.is_active is False
        assert other.is_active is True
        assert Semester.objects.filter(is_active=True).count() == 1

    def test_duplicate_enrollment_rejected(self, enrolled_student, offering):
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Enrollment.objects.create(
                    student=enrolled_student,
                    course_offering=offering,
                    status=Enrollment.Status.ACTIVE,
                )

    def test_duplicate_offering_for_course_semester_rejected(self, offering):
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                CourseOffering.objects.create(
                    course=offering.course,
                    semester=offering.semester,
                    department=offering.department,
                )


# ---------------------------------------------------------------------------
# Idempotency / sequential enforcement
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestIdempotency:
    def test_scan_points_awarded_once(self, class_session, lecturer_user, enrolled_student):
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(minutes=5),
        )
        first = award_scan_points(session, enrolled_student)
        second = award_scan_points(session, enrolled_student)
        assert first > 0
        assert second == 0
        assert PointsLedger.objects.filter(student=enrolled_student, attendance_session=session).count() == 1

    def test_manual_points_idempotent(self, class_session, lecturer_user, enrolled_student):
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(minutes=5),
        )
        award_manual_points(session, enrolled_student)
        award_manual_points(session, enrolled_student)
        assert PointsLedger.objects.filter(
            student=enrolled_student, attendance_session=session,
            category=PointsLedger.Category.MANUAL,
        ).count() == 1

    def test_student_of_class_is_idempotent(self, class_session, lecturer_user, enrolled_student, student2_user):
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(minutes=5),
        )
        AttendanceRecord.objects.create(attendance_session=session, student=enrolled_student)
        AttendanceRecord.objects.create(attendance_session=session, student=student2_user)
        first = award_student_of_class(session)
        second = award_student_of_class(session)
        assert first.id == second.id
        assert PointsLedger.objects.filter(
            attendance_session=session, category=PointsLedger.Category.STUDENT_OF_CLASS
        ).count() == 1

    def test_assignment_submission_limit_enforced(self, api_client, enrolled_student, offering, lecturer_user):
        assignment = Assignment.objects.create(
            course_offering=offering, created_by=lecturer_user,
            title="Race", max_submissions=1, due_at=timezone.now() + timedelta(days=1),
        )
        api_client.force_authenticate(user=enrolled_student)
        first = api_client.post(f"/api/v1/assignments/{assignment.id}/submissions/", {"note": "a"}, format="json")
        second = api_client.post(f"/api/v1/assignments/{assignment.id}/submissions/", {"note": "b"}, format="json")
        assert first.status_code == 201
        assert second.status_code == 403
        assert AssignmentSubmission.objects.filter(assignment=assignment).count() == 1

    def test_manual_attendance_endpoint_accepts_student_id(
        self, api_client, class_session, lecturer_user, enrolled_student
    ):
        """Regression: the view called award_manual_points(student_id=...) which
        did not match the function signature and raised a 500."""
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session, lecturer=lecturer_user,
            started_at=now, expires_at=now + timedelta(minutes=5),
        )
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.post(
            f"/api/v1/attendance/{session.id}/manual/",
            {"student_id": str(enrolled_student.id), "status": "PRESENT"},
            format="json",
        )
        assert resp.status_code == 201
        assert PointsLedger.objects.filter(
            student=enrolled_student, attendance_session=session,
            category=PointsLedger.Category.MANUAL,
        ).exists()


# ---------------------------------------------------------------------------
# True multi-threaded races (PostgreSQL only)
# ---------------------------------------------------------------------------

def _seed_postgres_world():
    """Create and commit a minimal world so worker threads can see it."""
    faculty = Faculty.objects.create(code="FET", name="Faculty")
    department = Department.objects.create(code="CS", name="CS", faculty=faculty)
    now = timezone.now().date()
    semester = Semester.objects.create(
        name="2030/2031 Semester 1", academic_year="2030/2031", number="1",
        start_date=now, end_date=now + timedelta(days=120), is_active=True,
    )
    course = Course.objects.create(code="CSC999", title="Concurrency", department=department)
    offering = CourseOffering.objects.create(course=course, semester=semester, department=department)
    lecturer = User.objects.create_user(
        email="race.lect@test.edu", password="x", first_name="R", last_name="L", role="LECTURER",
    )
    student = User.objects.create_user(
        email="race.stu@test.edu", password="x", first_name="R", last_name="S", role="STUDENT",
    )
    StudentProfile.objects.create(user=student, student_number="RACE1", department=department)
    Enrollment.objects.create(student=student, course_offering=offering, status=Enrollment.Status.ACTIVE)
    return offering, lecturer, student


def _run_threads(target, n):
    barrier = threading.Barrier(n)
    results = []
    lock = threading.Lock()

    def wrapped(i):
        try:
            barrier.wait()
            value = target(i)
            with lock:
                results.append(value)
        finally:
            connections.close_all()

    threads = [threading.Thread(target=wrapped, args=(i,)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


@pytest.mark.django_db(transaction=True)
def test_concurrent_submissions_respect_limit():
    if not _is_postgres():
        pytest.skip("SELECT ... FOR UPDATE row locking requires PostgreSQL")
    from rest_framework.test import APIClient

    offering, lecturer, student = _seed_postgres_world()
    assignment = Assignment.objects.create(
        course_offering=offering, created_by=lecturer,
        title="Race", max_submissions=3, due_at=timezone.now() + timedelta(days=1),
    )

    def submit(_i):
        client = APIClient()
        client.force_authenticate(user=student)
        resp = client.post(
            f"/api/v1/assignments/{assignment.id}/submissions/",
            {"note": "concurrent"}, format="json",
        )
        return resp.status_code

    statuses = _run_threads(submit, 10)
    assert statuses.count(201) == 3
    assert AssignmentSubmission.objects.filter(assignment=assignment).count() == 3


@pytest.mark.django_db(transaction=True)
def test_concurrent_double_scan_awards_once():
    if not _is_postgres():
        pytest.skip("SELECT ... FOR UPDATE row locking requires PostgreSQL")

    offering, lecturer, student = _seed_postgres_world()
    class_def = offering.class_definitions.create(
        lecturer=lecturer, name="Concurrency Lecture", class_type="LECTURE",
    )
    class_session = class_def.sessions.create(
        starts_at=timezone.now(), ends_at=timezone.now() + timedelta(hours=1), status="SCHEDULED",
    )
    now = timezone.now()
    session = AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer,
        started_at=now, expires_at=now + timedelta(minutes=10),
    )

    def scan(_i):
        return award_scan_points(session, student)

    awards = _run_threads(scan, 10)
    assert len([a for a in awards if a and a > 0]) == 1
    assert PointsLedger.objects.filter(student=student, attendance_session=session).count() == 1
