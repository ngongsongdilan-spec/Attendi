"""Regression tests for authors silently lost to read-only serializer fields.

The pattern: a view puts a field into `request.data`, the serializer declares it
read-only, so DRF drops it. When the model column is NOT NULL that is a 500;
when it is nullable the row saves with no author and nobody notices. Both were
present -- the assessment and assessment-group columns are nullable, so those
two failed silently.

Each test asserts the author is *recorded*, not merely that the POST succeeded.
"""
import pytest
from rest_framework.test import APIClient

from apps.academics.models import CourseOffering
from apps.accounts.models import User


@pytest.mark.django_db
class TestCreatedByIsRecorded:
    @pytest.fixture
    def lecturer(self):
        return User.objects.create_user(
            email="author@test.edu", password="test1234",
            first_name="Auth", last_name="Or", role="LECTURER",
        )

    @pytest.fixture
    def client(self, lecturer):
        c = APIClient()
        c.force_authenticate(user=lecturer)
        return c

    @pytest.fixture
    def offering(self, course, academic_period, cs_department, lecturer):
        return CourseOffering.objects.create(
            course=course, semester=academic_period,
            department=cs_department, lecturer=lecturer,
        )

    def test_announcement_records_its_author(self, client, lecturer):
        resp = client.post(
            "/api/v1/announcements/",
            {"title": "Exam timetable", "content": "Check the portal.", "scope_type": "FACULTY"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["created_by"] == str(lecturer.id)
        assert resp.json()["data"]["creator_name"] == lecturer.get_full_name()

    def test_assessment_records_its_author(self, client, lecturer, offering):
        resp = client.post(
            f"/api/v1/course-offerings/{offering.id}/assessments/",
            {"title": "Midterm", "maximum_score": 20, "weight": 1},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["created_by"] == str(lecturer.id)

    def test_assessment_group_records_its_author(self, client, lecturer, offering):
        resp = client.post(
            f"/api/v1/course-offerings/{offering.id}/assessment-groups/",
            {"title": "Continuous assessment", "maximum_score": 30},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["created_by"] == str(lecturer.id)

    def test_assignment_records_its_author(self, client, lecturer, offering):
        resp = client.post(
            f"/api/v1/course-offerings/{offering.id}/assignments/",
            {"title": "Lab 1", "description": "Submit the report"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["created_by"] == str(lecturer.id)

    def test_task_records_its_author(self, client, lecturer, offering, enrolled_student):
        """A group leader filing work for their own group is attributed to them."""
        from apps.projects.models import Project, ProjectGroup, ProjectMember

        project = Project.objects.create(
            course_offering=offering, created_by=lecturer, supervisor=lecturer,
            title="Capstone", scope=Project.Scope.CLASS_WIDE,
        )
        group = ProjectGroup.objects.create(project=project, name="Group A", leader=lecturer)
        ProjectMember.objects.create(
            project=project, student=lecturer, group=group,
            role=ProjectMember.Role.GROUP_LEADER,
        )
        resp = client.post(
            f"/api/v1/projects/{project.id}/tasks/",
            {"title": "Draft the schema"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["created_by"] == str(lecturer.id)


@pytest.mark.django_db
class TestNoEndpointReturnsServerError:
    """A handler whose signature does not match its URL raises TypeError -> 500.

    FlexibleStartAttendanceView carried a `get` that required an
    `attendance_session_id` its URL never passes, so a plain GET blew up with a
    TypeError instead of the expected 405. The client never GETs that endpoint,
    which is exactly why it went unnoticed. This sweeps every parameterless
    route so the whole class is caught, not just the one instance.
    """

    @pytest.fixture
    def lecturer(self):
        return User.objects.create_user(
            email="method@test.edu", password="test1234",
            first_name="Met", last_name="Hod", role="LECTURER",
        )

    def test_start_flex_rejects_get(self, lecturer):
        c = APIClient()
        c.force_authenticate(user=lecturer)
        resp = c.get("/api/v1/attendance/start-flex/")
        assert resp.status_code == 405, resp.content

    def test_no_get_reachable_route_returns_5xx(self, lecturer):
        from django.conf import settings
        from django.urls import get_resolver

        if "testserver" not in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ["testserver"]

        def walk(resolver, prefix=""):
            out = []
            for p in resolver.url_patterns:
                if hasattr(p, "url_patterns"):
                    out.extend(walk(p, prefix + str(p.pattern)))
                else:
                    out.append(prefix + str(p.pattern))
            return out

        c = APIClient()
        c.force_authenticate(user=lecturer)
        offenders = []
        for path in walk(get_resolver()):
            if not path.startswith("api/v1/") or "<" in path or "export.csv" in path:
                continue
            try:
                resp = c.get("/" + path)
            except Exception as exc:  # noqa: BLE001
                offenders.append((path, f"{type(exc).__name__}: {exc}"))
                continue
            if resp.status_code >= 500:
                offenders.append((path, f"HTTP {resp.status_code}"))
        assert not offenders, "routes returning 5xx on GET: " + repr(offenders)


@pytest.mark.django_db
class TestDemoSeederRefusesProduction:
    """seed_demo creates admin@fet.edu / admin123 and friends.

    Those passwords are printed in the README, so running the seeder against a
    production database would hand out a backdoor. It must refuse unless the
    operator explicitly forces it.
    """

    def test_refuses_when_debug_is_off(self, settings):
        from django.core.management import call_command
        from django.core.management.base import CommandError

        settings.DEBUG = False
        with pytest.raises(CommandError) as exc:
            call_command("seed_demo", verbosity=0)
        assert "DEBUG=False" in str(exc.value)

    def test_runs_when_forced(self, settings):
        from django.core.management import call_command
        from apps.accounts.models import User

        settings.DEBUG = False
        call_command("seed_demo", verbosity=0, force=True)
        assert User.objects.filter(email="admin@fet.edu").exists()

    def test_runs_normally_in_development(self, settings):
        from django.core.management import call_command
        from apps.accounts.models import User

        settings.DEBUG = True
        call_command("seed_demo", verbosity=0)
        assert User.objects.filter(email="admin@fet.edu").exists()
