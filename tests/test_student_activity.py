"""Tests for the student activity/profile hub endpoint."""
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User
from apps.attendance.models import AttendanceRecord, AttendanceSession, PointsLedger
from apps.projects.models import (
    AssessmentComponent,
    AssessmentRecord,
    Project,
    ProjectGroup,
    ProjectMember,
    ProjectTask,
)


@pytest.fixture
def activity_project(offering, lecturer_user):
    return Project.objects.create(
        course_offering=offering,
        created_by=lecturer_user,
        supervisor=lecturer_user,
        title="Activity Project",
    )


def _session(class_session, lecturer_user, offset_minutes):
    now = timezone.now() + timedelta(minutes=offset_minutes)
    return AttendanceSession.objects.create(
        class_session=class_session, lecturer=lecturer_user,
        started_at=now, expires_at=now + timedelta(seconds=600),
    )


@pytest.fixture
def full_activity(activity_project, class_session, lecturer_user, enrolled_student):
    """Attendance + points + project + task + assessment data for the student."""
    s1 = _session(class_session, lecturer_user, 0)
    s2 = _session(class_session, lecturer_user, -30)
    s3 = _session(class_session, lecturer_user, -60)
    AttendanceRecord.objects.create(attendance_session=s1, student=enrolled_student, status="PRESENT")
    AttendanceRecord.objects.create(attendance_session=s2, student=enrolled_student, status="LATE")
    AttendanceRecord.objects.create(attendance_session=s3, student=enrolled_student, status="ABSENT")
    PointsLedger.objects.create(student=enrolled_student, attendance_session=s1, category="SCAN", points=4)
    PointsLedger.objects.create(student=enrolled_student, attendance_session=s2, category="MANUAL", points=6)

    group = ProjectGroup.objects.create(project=activity_project, name="Group A")
    ProjectMember.objects.create(project=activity_project, student=enrolled_student, group=group)
    task = ProjectTask.objects.create(
        project=activity_project, group=group, assigned_student=enrolled_student,
        created_by=lecturer_user, title="Build schema", status=ProjectTask.Status.COMPLETED,
    )
    from apps.projects.models import ProjectContribution
    ProjectContribution.objects.create(
        project=activity_project, student=enrolled_student, task=task, contribution_type="TASK_COMPLETION"
    )

    comp = AssessmentComponent.objects.create(
        project=activity_project, name="Code quality", maximum_score=20, weight=40
    )
    AssessmentRecord.objects.create(
        assessment_component=comp, student=enrolled_student, assessor=lecturer_user,
        score=16, status="FINALIZED",
    )
    comp2 = AssessmentComponent.objects.create(project=activity_project, name="Draft only")
    AssessmentRecord.objects.create(
        assessment_component=comp2, student=enrolled_student, assessor=lecturer_user, score=0, status="DRAFT"
    )
    return activity_project


@pytest.mark.django_db
class TestStudentActivity:
    def test_student_reads_own_activity(self, api_client, full_activity, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/students/me/activity/")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["student"]["id"] == str(enrolled_student.id)

        stats = data["stats"]
        assert stats["attendance_total"] == 3
        assert stats["attendance_present"] == 1
        assert stats["attendance_late"] == 1
        assert stats["attendance_absent"] == 1
        assert stats["attendance_rate"] == 33
        assert stats["points_total"] == 10
        assert stats["points_by_category"]["SCAN"] == 4
        assert stats["projects_total"] == 1
        assert stats["tasks_assigned"] == 1
        assert stats["tasks_completed"] == 1
        assert stats["contributions_count"] == 1

        row = data["attendance_by_course"][0]
        assert row["course_code"] == "CSC301"
        assert row["total"] == 3
        assert row["rate"] == 33

        assert len(data["recent_attendance"]) == 3
        project = data["projects"][0]
        assert project["title"] == "Activity Project"
        assert project["role"] == "MEMBER"

        assert len(data["assessments"]) == 1
        assert data["assessments"][0]["component_name"] == "Code quality"
        assert data["assessments"][0]["score"] in ("16", "16.00")

    def test_other_student_forbidden(self, api_client, full_activity, enrolled_student, student2_user):
        api_client.force_authenticate(user=student2_user)
        resp = api_client.get(f"/api/v1/students/{enrolled_student.id}/activity/")
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"

    def test_lecturer_can_read_student(self, api_client, full_activity, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/students/{enrolled_student.id}/activity/")
        assert resp.status_code == 200
        assert resp.json()["data"]["student"]["id"] == str(enrolled_student.id)

    def test_admin_can_read_student(self, api_client, full_activity, enrolled_student):
        admin = User.objects.create_user(
            email="admin@test.edu", password="test1234", first_name="Ad", last_name="Min", role="SYSTEM_ADMIN"
        )
        api_client.force_authenticate(user=admin)
        resp = api_client.get(f"/api/v1/students/{enrolled_student.id}/activity/")
        assert resp.status_code == 200

    def test_non_student_target_not_found(self, api_client, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/students/{lecturer_user.id}/activity/")
        assert resp.status_code == 404

    def test_unauthenticated_rejected(self, api_client, enrolled_student):
        resp = api_client.get("/api/v1/students/me/activity/")
        assert resp.status_code in (401, 403)

    def test_me_serializer_exposes_profile_fields(self, api_client, enrolled_student, cs_department):
        enrolled_student.student_profile.personal_email = "personal@mail.com"
        enrolled_student.student_profile.admission_year = 2023
        enrolled_student.student_profile.achievements = ["Dean's list"]
        enrolled_student.student_profile.save()
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/auth/me/")
        assert resp.status_code == 200
        sp = resp.json()["data"]["student_profile"]
        assert sp["personal_email"] == "personal@mail.com"
        assert sp["admission_year"] == 2023
        assert sp["achievements"] == ["Dean's list"]
        assert sp["department"]["code"] == "CS"

    def test_profile_update_personal_email_and_achievements(self, api_client, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.patch(
            "/api/v1/auth/me/",
            {"personal_email": "new.personal@mail.com", "achievements": ["Top of class"]},
            format="json",
        )
        assert resp.status_code == 200
        enrolled_student.student_profile.refresh_from_db()
        assert enrolled_student.student_profile.personal_email == "new.personal@mail.com"
        assert enrolled_student.student_profile.achievements == ["Top of class"]