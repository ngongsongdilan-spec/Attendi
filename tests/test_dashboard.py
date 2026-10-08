"""Regression tests for the aggregated dashboard endpoint.

The student payload once referenced a name that was never defined, so every
student dashboard request raised NameError and returned 500. The whole
endpoint is therefore asserted for shape as well as status, because a 200 with
missing keys is just as broken for the frontend as a 500.
"""
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User
from apps.attendance.models import AttendanceRecord, AttendanceSession
from apps.projects.models import Project, ProjectGroup, ProjectMember, ProjectTask


def _mark(class_session, lecturer_user, student, status, minutes=0):
    now = timezone.now() + timedelta(minutes=minutes)
    session = AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer_user,
        started_at=now, expires_at=now + timedelta(seconds=600),
    )
    return AttendanceRecord.objects.create(
        attendance_session=session, student=student, status=status
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="dash-admin@test.edu", password="test1234",
        first_name="Dash", last_name="Admin", role="SYSTEM_ADMIN",
    )


@pytest.mark.django_db
class TestDashboardShape:
    """All three roles must expose the same top-level keys."""

    def test_student_dashboard(self, api_client, enrolled_student, offering, class_session, lecturer_user):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/dashboard/")
        assert resp.status_code == 200, resp.content
        data = resp.json()["data"]

        assert data["role"] == "STUDENT"
        for key in ("stats", "attendance", "courses", "today_classes",
                    "announcements", "active_projects", "pending_tasks"):
            assert key in data, f"student dashboard missing {key}"

        # The frontend reads exactly these attendance fields.
        for key in ("total_sessions", "present", "absent", "rate"):
            assert key in data["attendance"], f"attendance missing {key}"

        assert data["stats"]["enrolled_courses"] == 1
        assert data["courses"][0]["code"] == offering.course.code

    def test_lecturer_dashboard_shares_the_shape(self, api_client, lecturer_user, class_def):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get("/api/v1/dashboard/")
        assert resp.status_code == 200, resp.content
        data = resp.json()["data"]

        assert data["role"] == "LECTURER"
        for key in ("stats", "attendance", "today_classes", "my_courses", "active_projects"):
            assert key in data, f"lecturer dashboard missing {key}"
        assert data["stats"]["my_classes"] >= 1
        assert data["stats"]["my_students"] >= 0

    def test_admin_dashboard(self, api_client, admin_user, enrolled_student):
        api_client.force_authenticate(user=admin_user)
        resp = api_client.get("/api/v1/dashboard/")
        assert resp.status_code == 200, resp.content
        data = resp.json()["data"]

        assert data["stats"]["total_users"] >= 1
        assert data["stats"]["total_students"] >= 1
        # Flat keys predate `stats` and are still used by the admin screen.
        assert data["total_users"] == data["stats"]["total_users"]
        assert data["total_students"] == data["stats"]["total_students"]
        assert data["total_lecturers"] == data["stats"]["total_lecturers"]

    def test_unauthenticated_rejected(self, api_client):
        resp = api_client.get("/api/v1/dashboard/")
        assert resp.status_code in (401, 403)


@pytest.mark.django_db
class TestAttendanceRate:
    """EXCUSED must not be counted, and an empty history must not divide by zero."""

    def test_excused_is_excluded(self, api_client, enrolled_student, class_session, lecturer_user):
        _mark(class_session, lecturer_user, enrolled_student, "PRESENT")
        _mark(class_session, lecturer_user, enrolled_student, "ABSENT", -10)
        _mark(class_session, lecturer_user, enrolled_student, "EXCUSED", -20)

        api_client.force_authenticate(user=enrolled_student)
        att = api_client.get("/api/v1/dashboard/").json()["data"]["attendance"]

        assert att["present"] == 1
        assert att["absent"] == 1
        assert att["total_sessions"] == 2, "EXCUSED must stay out of the denominator"
        assert att["rate"] == 50

    def test_no_records_reports_zero_not_an_error(self, api_client, enrolled_student, offering):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/dashboard/")
        assert resp.status_code == 200
        att = resp.json()["data"]["attendance"]

        assert att["total_sessions"] == 0
        assert att["rate"] == 0, "must be 0 rather than a ZeroDivisionError or NaN"

    def test_rate_never_leaves_0_100(self, api_client, enrolled_student, class_session, lecturer_user):
        for i in range(3):
            _mark(class_session, lecturer_user, enrolled_student, "PRESENT", -i)
        for i in range(5, 8):
            _mark(class_session, lecturer_user, enrolled_student, "ABSENT", -i)

        api_client.force_authenticate(user=enrolled_student)
        att = api_client.get("/api/v1/dashboard/").json()["data"]["attendance"]

        assert att["present"] == 3
        assert att["absent"] == 3
        assert att["rate"] == 50
        assert 0 <= att["rate"] <= 100

    def test_all_present_is_100(self, api_client, enrolled_student, class_session, lecturer_user):
        _mark(class_session, lecturer_user, enrolled_student, "PRESENT")
        _mark(class_session, lecturer_user, enrolled_student, "LATE", -10)

        api_client.force_authenticate(user=enrolled_student)
        att = api_client.get("/api/v1/dashboard/").json()["data"]["attendance"]
        assert att["rate"] == 100, "LATE still counts as attended"


@pytest.mark.django_db
class TestProjectAndTaskFields:
    def test_project_task_counts_are_integers_not_queries(self, api_client, enrolled_student, offering, lecturer_user):
        project = Project.objects.create(
            course_offering=offering, created_by=lecturer_user,
            supervisor=lecturer_user, title="Dashboard Project",
            status=Project.Status.ACTIVE,
        )
        group = ProjectGroup.objects.create(project=project, name="Group A")
        ProjectMember.objects.create(project=project, student=enrolled_student, group=group)
        ProjectTask.objects.create(
            project=project, group=group, assigned_student=enrolled_student,
            created_by=lecturer_user, title="One", status=ProjectTask.Status.COMPLETED,
        )
        ProjectTask.objects.create(
            project=project, group=group, assigned_student=enrolled_student,
            created_by=lecturer_user, title="Two", status=ProjectTask.Status.TODO,
        )

        api_client.force_authenticate(user=enrolled_student)
        projects = api_client.get("/api/v1/dashboard/").json()["data"]["active_projects"]

        assert len(projects) == 1
        row = projects[0]
        # The frontend renders these directly, so a stray queryset or None breaks it.
        assert row["title"] == "Dashboard Project"
        assert row["task_count"] == 2
        assert row["completed_task_count"] == 1
        assert isinstance(row["task_count"], int)
        assert "deadline" in row

    def test_draft_project_is_not_listed_as_active(self, api_client, enrolled_student, offering, lecturer_user):
        """Only ACTIVE projects belong on the dashboard."""
        project = Project.objects.create(
            course_offering=offering, created_by=lecturer_user,
            supervisor=lecturer_user, title="Still A Draft",
        )
        group = ProjectGroup.objects.create(project=project, name="Group A")
        ProjectMember.objects.create(project=project, student=enrolled_student, group=group)

        api_client.force_authenticate(user=enrolled_student)
        projects = api_client.get("/api/v1/dashboard/").json()["data"]["active_projects"]

        assert project.status == Project.Status.DRAFT
        assert projects == []

    def test_shared_project_is_listed_once_for_each_student(
        self, api_client, enrolled_student, student2_user, offering, lecturer_user
    ):
        """The membership join must not inflate the project row.

        The counts are annotated, so without a distinct this could come back
        once per matching membership/task row.
        """
        project = Project.objects.create(
            course_offering=offering, created_by=lecturer_user,
            supervisor=lecturer_user, title="Shared Project",
            status=Project.Status.ACTIVE,
        )
        for student in (enrolled_student, student2_user):
            group = ProjectGroup.objects.create(project=project, name=f"Group {student.last_name}")
            ProjectMember.objects.create(project=project, student=student, group=group)
        for i in range(3):
            ProjectTask.objects.create(
                project=project, created_by=lecturer_user,
                title=f"Task {i}", status=ProjectTask.Status.TODO,
            )

        api_client.force_authenticate(user=enrolled_student)
        projects = api_client.get("/api/v1/dashboard/").json()["data"]["active_projects"]

        assert len(projects) == 1, "the project must not be duplicated by the annotation join"
        assert projects[0]["task_count"] == 3

    def test_pending_task_carries_project_and_status(self, api_client, enrolled_student, offering, lecturer_user):
        project = Project.objects.create(
            course_offering=offering, created_by=lecturer_user,
            supervisor=lecturer_user, title="Task Project",
        )
        group = ProjectGroup.objects.create(project=project, name="Group A")
        ProjectMember.objects.create(project=project, student=enrolled_student, group=group)
        ProjectTask.objects.create(
            project=project, group=group, assigned_student=enrolled_student,
            created_by=lecturer_user, title="Write docs", status=ProjectTask.Status.TODO,
        )

        api_client.force_authenticate(user=enrolled_student)
        tasks = api_client.get("/api/v1/dashboard/").json()["data"]["pending_tasks"]

        assert len(tasks) == 1
        assert tasks[0]["project"] == "Task Project"
        assert tasks[0]["status"] == "TODO"
        assert "due_at" in tasks[0]
