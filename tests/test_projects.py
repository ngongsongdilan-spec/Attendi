"""Tests for project management business rules (FR-83, BR-101/102)."""
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.academics.models import Enrollment
from apps.accounts.models import StudentProfile, User
from apps.projects.models import (
    AssessmentComponent,
    AssessmentRecord,
    ClassDelegate,
    Project,
    ProjectContribution,
    ProjectGroup,
    ProjectMember,
    ProjectMilestone,
    ProjectTask,
)


@pytest.fixture
def project(offering, lecturer_user):
    return Project.objects.create(
        course_offering=offering,
        created_by=lecturer_user,
        supervisor=lecturer_user,
        title="Database Systems Group Project",
    )


@pytest.fixture
def project_group(project):
    return ProjectGroup.objects.create(project=project, name="Group A")


@pytest.fixture
def staff_client(api_client, lecturer_user):
    api_client.force_authenticate(user=lecturer_user)
    return api_client


@pytest.fixture
def taught_offering(offering, lecturer_user):
    """The base `offering` fixture has no lecturer; appoint one.

    Needed by anything that keys off `course_offering.lecturer`, such as
    appointing the class delegate.
    """
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer", "updated_at"])
    return offering


def _member_payload(student, role="MEMBER"):
    return {"student_id": str(student.id), "role": role}


@pytest.mark.django_db
class TestMilestonesAPI:
    def test_student_can_list_milestones(self, api_client, project, enrolled_student, staff_client):
        ProjectMember.objects.create(project=project, student=enrolled_student)
        ProjectMilestone.objects.create(project=project, title="Design doc", due_at=timezone.now())
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/projects/{project.id}/milestones/")
        assert resp.status_code == 200
        assert resp.json()["data"][0]["title"] == "Design doc"

    def test_non_member_student_cannot_list_milestones(self, api_client, project, student2_user):
        """A student outside the project must not read its schedule."""
        ProjectMilestone.objects.create(project=project, title="Design doc", due_at=timezone.now())
        api_client.force_authenticate(user=student2_user)
        resp = api_client.get(f"/api/v1/projects/{project.id}/milestones/")
        assert resp.status_code == 403

    def test_supervisor_can_create_milestone(self, staff_client, project):
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/milestones/",
            {"title": "Final submission", "description": "Submit report + code"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["title"] == "Final submission"

    def test_student_cannot_create_milestone(self, api_client, project, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/projects/{project.id}/milestones/", {"title": "Hack"}, format="json"
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"

    def test_supervisor_can_update_milestone(self, staff_client, project):
        ms = ProjectMilestone.objects.create(project=project, title="Draft")
        resp = staff_client.patch(
            f"/api/v1/milestones/{ms.id}/", {"status": "COMPLETED"}, format="json"
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "COMPLETED"

    def test_other_lecturer_cannot_update_milestone(self, api_client, project, course, academic_period, cs_department):
        other = User.objects.create_user(
            email="other@test.edu", password="test1234", first_name="Other", last_name="Lecturer", role="LECTURER"
        )
        ms = ProjectMilestone.objects.create(project=project, title="Draft")
        api_client.force_authenticate(user=other)
        resp = api_client.patch(f"/api/v1/milestones/{ms.id}/", {"status": "COMPLETED"}, format="json")
        assert resp.status_code == 403

    def test_supervisor_can_delete_milestone(self, staff_client, project):
        ms = ProjectMilestone.objects.create(project=project, title="Temp")
        resp = staff_client.delete(f"/api/v1/milestones/{ms.id}/")
        assert resp.status_code == 204
        assert not ProjectMilestone.objects.filter(id=ms.id).exists()


@pytest.mark.django_db
class TestProjectAssessmentPermissions:
    def test_course_lecturer_can_create_project_assessment(self, staff_client, project):
        response = staff_client.post(
            f"/api/v1/projects/{project.id}/assessments/",
            {"name": "Project report", "maximum_score": "100", "weight": "1"},
            format="json",
        )

        assert response.status_code == 201, response.content
        assert response.json()["data"]["name"] == "Project report"

    def test_member_sees_only_own_finalized_project_score(
        self, api_client, project, enrolled_student, student2_user
    ):
        from apps.projects.models import AssessmentRecord

        member = ProjectMember.objects.create(project=project, student=enrolled_student)
        component = AssessmentComponent.objects.create(
            project=project, name="Project report", maximum_score=100
        )
        AssessmentRecord.objects.create(
            assessment_component=component,
            student=enrolled_student,
            assessor=project.supervisor,
            score=88,
            feedback="Clear work",
            status=AssessmentRecord.Status.FINALIZED,
        )
        AssessmentRecord.objects.create(
            assessment_component=component,
            student=student2_user,
            assessor=project.supervisor,
            score=41,
            feedback="Another student's score",
            status=AssessmentRecord.Status.FINALIZED,
        )
        api_client.force_authenticate(user=enrolled_student)

        response = api_client.get(f"/api/v1/projects/{project.id}/assessments/")

        assert response.status_code == 200, response.content
        record = response.json()["data"][0]["my_record"]
        assert record["student"] == str(enrolled_student.id)
        assert record["score"] == "88.00"
        assert "Another student's score" not in response.content.decode()

        detail_endpoints = [
            f"/api/v1/projects/{project.id}/",
            f"/api/v1/projects/{project.id}/groups/",
            f"/api/v1/projects/{project.id}/tasks/",
            f"/api/v1/projects/{project.id}/milestones/",
            f"/api/v1/projects/{project.id}/documents/",
            f"/api/v1/projects/{project.id}/contributions/",
            f"/api/v1/projects/{project.id}/assessments/",
        ]
        statuses = {endpoint: api_client.get(endpoint).status_code for endpoint in detail_endpoints}
        assert set(statuses.values()) == {200}, statuses


@pytest.mark.django_db
class TestGroupMemberEligibility:
    """BR-101: only students enrolled in the project's offering may join."""

    def test_enrolled_student_can_be_added(self, staff_client, project, project_group, enrolled_student):
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/groups/{project_group.id}/members/",
            _member_payload(enrolled_student),
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["role"] == "MEMBER"

    def test_non_enrolled_student_rejected(self, staff_client, project, project_group, student2_user):
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/groups/{project_group.id}/members/",
            _member_payload(student2_user),
            format="json",
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"

    def test_enrolled_later_student_can_be_added(self, staff_client, project, project_group, student2_user, offering):
        Enrollment.objects.create(student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE)
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/groups/{project_group.id}/members/",
            _member_payload(student2_user),
            format="json",
        )
        assert resp.status_code == 201

    def test_duplicate_membership_rejected(self, staff_client, project, project_group, enrolled_student):
        ProjectMember.objects.create(project=project, student=enrolled_student, group=project_group)
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/groups/{project_group.id}/members/",
            _member_payload(enrolled_student),
            format="json",
        )
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "CONFLICT"

    def test_unknown_student_rejected(self, staff_client, project, project_group):
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/groups/{project_group.id}/members/",
            {"student_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert resp.status_code == 400

    def test_invalid_role_rejected(self, staff_client, project, project_group, enrolled_student):
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/groups/{project_group.id}/members/",
            _member_payload(enrolled_student, role="CAPTAIN"),
            format="json",
        )
        assert resp.status_code == 400

    def test_student_permission_denied_for_all_admin_actions(self, api_client, project, project_group, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/projects/{project.id}/groups/", {"name": "My Group"}, format="json"
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestProjectCandidates:
    def test_candidates_are_enrolled_and_exclude_members(
        self, staff_client, project, project_group, enrolled_student, student2_user, offering,
        course, academic_period, cs_department,
    ):
        from apps.academics.models import Course, CourseOffering

        other_course = Course.objects.create(
            code="CSC101", title="Intro", department=cs_department, credit_units=2
        )
        other_offering = CourseOffering.objects.create(
            course=other_course, semester=academic_period, department=cs_department
        )
        Enrollment.objects.create(
            student=student2_user, course_offering=other_offering, status=Enrollment.Status.ACTIVE
        )

        resp = staff_client.get(f"/api/v1/projects/{project.id}/candidates/")
        assert resp.status_code == 200
        emails = [c["email"] for c in resp.json()["data"]]
        assert enrolled_student.email in emails   # enrolled in project offering
        assert student2_user.email not in emails  # enrolled elsewhere

        ProjectMember.objects.create(project=project, student=enrolled_student, group=project_group)
        resp = staff_client.get(f"/api/v1/projects/{project.id}/candidates/")
        assert enrolled_student.email not in [c["email"] for c in resp.json()["data"]]

    def test_student_cannot_access_candidates(self, api_client, project, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/projects/{project.id}/candidates/")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestProjectListForRoles:
    def test_student_sees_only_own_projects(self, api_client, project, enrolled_student, offering, lecturer_user):
        other_project = Project.objects.create(
            course_offering=offering, created_by=lecturer_user, supervisor=lecturer_user, title="Other"
        )
        ProjectMember.objects.create(project=other_project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/projects/")
        titles = [p["title"] for p in resp.json()["data"]]
        assert titles == ["Other"]  # member project only, own project not yet joined

    def test_lecturer_sees_supervised_and_created(self, api_client, project, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get("/api/v1/projects/")
        assert any(p["title"] == project.title for p in resp.json()["data"])


# ---------------------------------------------------------------------------
# Project scopes: INDIVIDUAL / CLASS_WIDE / GROUP_SPECIFIC
# ---------------------------------------------------------------------------


@pytest.fixture
def class_wide_project(offering, lecturer_user):
    return Project.objects.create(
        course_offering=offering,
        created_by=lecturer_user,
        supervisor=lecturer_user,
        title="Capstone Project",
        scope=Project.Scope.CLASS_WIDE,
    )


@pytest.mark.django_db
class TestProjectScopes:
    def test_creating_class_wide_auto_enrols_the_whole_class(
        self, staff_client, offering, enrolled_student, student2_user
    ):
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE
        )
        resp = staff_client.post(
            "/api/v1/projects/create/",
            {
                "course_offering": str(offering.id),
                "title": "Capstone",
                "description": "Group work",
                "status": "ACTIVE",
                "scope": "CLASS_WIDE",
            },
            format="json",
        )
        assert resp.status_code == 201, resp.content
        project_id = resp.json()["data"]["id"]
        assert ProjectMember.objects.filter(project_id=project_id).count() == 2
        assert Project.objects.get(id=project_id).scope == "CLASS_WIDE"

    def test_individual_project_also_enrols_the_class(self, staff_client, offering, enrolled_student):
        resp = staff_client.post(
            "/api/v1/projects/create/",
            {"course_offering": str(offering.id), "title": "Solo Project", "scope": "INDIVIDUAL"},
            format="json",
        )
        assert resp.status_code == 201
        assert ProjectMember.objects.filter(project_id=resp.json()["data"]["id"]).count() == 1

    def test_group_specific_project_requires_a_group(self, staff_client, offering):
        resp = staff_client.post(
            "/api/v1/projects/create/",
            {"course_offering": str(offering.id), "title": "Group Build", "scope": "GROUP_SPECIFIC"},
            format="json",
        )
        assert resp.status_code == 400
        assert "group" in resp.json()["error"].get("message", "").lower() or "group" in str(resp.json())

    def test_group_specific_project_inherits_group_members(
        self, staff_client, class_wide_project, enrolled_student, student2_user
    ):
        offering = class_wide_project.course_offering
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE
        )
        group = ProjectGroup.objects.create(
            project=class_wide_project, name="Team Rocket", leader=enrolled_student
        )
        ProjectMember.objects.create(
            project=class_wide_project, student=enrolled_student, group=group,
            role=ProjectMember.Role.GROUP_LEADER,
        )
        ProjectMember.objects.create(
            project=class_wide_project, student=student2_user, group=group
        )

        resp = staff_client.post(
            "/api/v1/projects/create/",
            {
                "course_offering": str(offering.id),
                "title": "Sub Build",
                "scope": "GROUP_SPECIFIC",
                "group": str(group.id),
            },
            format="json",
        )
        assert resp.status_code == 201, resp.content
        sub = Project.objects.get(id=resp.json()["data"]["id"])
        assert sub.group_id == group.id
        assert sub.members.count() == 2
        assert sub.members.filter(group=group).count() == 2

    def test_group_assigned_project_cannot_use_its_own_group(
        self, staff_client, class_wide_project
    ):
        """A project may not be re-pointed at one of its own groups."""
        group = ProjectGroup.objects.create(project=class_wide_project, name="Self")
        resp = staff_client.patch(
            f"/api/v1/projects/{class_wide_project.id}/",
            {"scope": "GROUP_SPECIFIC", "group": str(group.id)},
            format="json",
        )
        assert resp.status_code == 400

    def test_group_assigned_project_cannot_borrow_another_courses_group(
        self, staff_client, project, class_wide_project, cs_department, academic_period
    ):
        from apps.academics.models import Course, CourseOffering

        other_course = Course.objects.create(
            code="CSC999", title="Elsewhere", department=cs_department,
            credit_units=3, level="300",
        )
        other_offering = CourseOffering.objects.create(
            course=other_course, semester=academic_period, department=cs_department
        )
        foreign_project = Project.objects.create(
            course_offering=other_offering,
            created_by=class_wide_project.created_by,
            supervisor=class_wide_project.supervisor,
            title="Elsewhere project", scope=Project.Scope.CLASS_WIDE,
        )
        foreign_group = ProjectGroup.objects.create(project=foreign_project, name="Foreign")

        resp = staff_client.post(
            "/api/v1/projects/create/",
            {
                "course_offering": str(project.course_offering_id),
                "title": "Borrowed",
                "scope": "GROUP_SPECIFIC",
                "group": str(foreign_group.id),
            },
            format="json",
        )
        assert resp.status_code == 400

    def test_only_class_wide_projects_accept_groups(self, staff_client, project):
        resp = staff_client.post(
            f"/api/v1/projects/{project.id}/groups/", {"name": "Nope"}, format="json"
        )
        assert resp.status_code == 400
        assert "class-wide" in resp.json()["error"]["message"].lower()

    def test_scope_filter_on_list(self, staff_client, project, class_wide_project):
        resp = staff_client.get("/api/v1/projects/?scope=CLASS_WIDE")
        assert resp.status_code == 200
        codes = [p["scope"] for p in resp.json()["data"]]
        assert codes and all(c == "CLASS_WIDE" for c in codes)


# ---------------------------------------------------------------------------
# Unassigned bucket
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUnassignedBucket:
    def test_unassigned_lists_students_without_a_group(
        self, staff_client, class_wide_project, enrolled_student
    ):
        ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        resp = staff_client.get(f"/api/v1/projects/{class_wide_project.id}/unassigned/")
        assert resp.status_code == 200
        assert [s["id"] for s in resp.json()["data"]] == [str(enrolled_student.id)]

    def test_grouped_students_leave_the_bucket(
        self, staff_client, class_wide_project, enrolled_student
    ):
        member = ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        group = ProjectGroup.objects.create(project=class_wide_project, name="A")
        member.group = group
        member.save(update_fields=["group"])

        resp = staff_client.get(f"/api/v1/projects/{class_wide_project.id}/unassigned/")
        assert resp.json()["data"] == []

    def test_overview_reports_unassigned_count(
        self, staff_client, class_wide_project, enrolled_student
    ):
        ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        resp = staff_client.get(f"/api/v1/projects/{class_wide_project.id}/overview/")
        assert resp.status_code == 200
        body = resp.json()["data"]
        assert body["summary"]["unassigned_count"] == 1
        assert body["unassigned"][0]["id"] == str(enrolled_student.id)

    def test_plain_student_cannot_see_the_unassigned_bucket(
        self, api_client, class_wide_project, enrolled_student
    ):
        ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/projects/{class_wide_project.id}/unassigned/")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Class delegate
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestClassDelegate:
    def test_lecturer_appoints_a_delegate(self, staff_client, taught_offering, enrolled_student):
        resp = staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(enrolled_student.id)},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["student_name"] == enrolled_student.get_full_name()

    def test_only_one_delegate_per_offering(self, staff_client, taught_offering, enrolled_student, student2_user):
        Enrollment.objects.create(
            student=student2_user, course_offering=taught_offering, status=Enrollment.Status.ACTIVE
        )
        staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(enrolled_student.id)}, format="json",
        )
        resp = staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(student2_user.id)}, format="json",
        )
        assert resp.status_code == 201
        from apps.projects.models import ClassDelegate
        assert ClassDelegate.objects.filter(course_offering=taught_offering).count() == 1
        assert ClassDelegate.objects.get(course_offering=taught_offering).student_id == student2_user.id

    def test_delegate_must_be_enrolled(self, staff_client, taught_offering, student2_user):
        resp = staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(student2_user.id)}, format="json",
        )
        assert resp.status_code == 400

    def test_student_cannot_appoint_a_delegate(self, api_client, taught_offering, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(enrolled_student.id)}, format="json",
        )
        assert resp.status_code == 403

    def test_delegate_can_create_groups_in_a_class_wide_project(
        self, api_client, staff_client, taught_offering, class_wide_project, enrolled_student
    ):
        staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(enrolled_student.id)}, format="json",
        )
        ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/projects/{class_wide_project.id}/groups/",
            {"name": "Delegate Team"}, format="json",
        )
        assert resp.status_code == 201, resp.content

    def test_delegate_cannot_edit_the_project_itself(
        self, api_client, staff_client, taught_offering, class_wide_project, enrolled_student
    ):
        staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(enrolled_student.id)}, format="json",
        )
        ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.patch(
            f"/api/v1/projects/{class_wide_project.id}/", {"title": "Hijacked"}, format="json"
        )
        assert resp.status_code == 403

    def test_delegate_cannot_read_grading(self, api_client, staff_client, taught_offering, class_wide_project, enrolled_student):
        from apps.projects.models import AssessmentComponent
        AssessmentComponent.objects.create(project=class_wide_project, name="Report", maximum_score=100)
        staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(enrolled_student.id)}, format="json",
        )
        ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/projects/{class_wide_project.id}/assessments/")
        assert resp.status_code == 403

    def test_delegate_cannot_manage_groups_of_an_individual_project(
        self, api_client, staff_client, taught_offering, project, enrolled_student
    ):
        staff_client.post(
            f"/api/v1/course-offerings/{taught_offering.id}/delegate/",
            {"student": str(enrolled_student.id)}, format="json",
        )
        ProjectMember.objects.create(project=project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/projects/{project.id}/groups/", {"name": "Nope"}, format="json"
        )
        assert resp.status_code == 403

    def test_delegate_candidates_lists_enrolled_students(
        self, staff_client, taught_offering, enrolled_student
    ):
        resp = staff_client.get(f"/api/v1/course-offerings/{taught_offering.id}/delegate-candidates/")
        assert resp.status_code == 200
        assert enrolled_student.email in [s["email"] for s in resp.json()["data"]]


# ---------------------------------------------------------------------------
# Access control that used to be wide open
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestProjectAccessControl:
    def test_non_member_student_cannot_read_a_project(self, api_client, project, student2_user):
        api_client.force_authenticate(user=student2_user)
        resp = api_client.get(f"/api/v1/projects/{project.id}/")
        assert resp.status_code == 403

    def test_non_member_student_cannot_read_another_group_report(
        self, api_client, project, project_group, enrolled_student, student2_user
    ):
        ProjectMember.objects.create(
            project=project, student=enrolled_student, group=project_group
        )
        api_client.force_authenticate(user=student2_user)
        resp = api_client.get(f"/api/v1/projects/{project.id}/groups/{project_group.id}/report/")
        assert resp.status_code == 403

    def test_student_cannot_create_tasks(self, api_client, project, enrolled_student):
        ProjectMember.objects.create(project=project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/projects/{project.id}/tasks/", {"title": "Sneaky"}, format="json"
        )
        assert resp.status_code == 403

    def test_student_cannot_edit_someone_elses_task(
        self, api_client, project, enrolled_student, student2_user
    ):
        ProjectMember.objects.create(project=project, student=enrolled_student)
        task = ProjectTask.objects.create(
            project=project, created_by=enrolled_student, title="Not yours",
            assigned_student=student2_user,
        )
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.patch(f"/api/v1/tasks/{task.id}/", {"title": "Hijack"}, format="json")
        assert resp.status_code == 403

    def test_assignee_may_move_status_but_not_rename(
        self, api_client, project, enrolled_student
    ):
        ProjectMember.objects.create(project=project, student=enrolled_student)
        task = ProjectTask.objects.create(
            project=project, created_by=enrolled_student, title="Mine",
            assigned_student=enrolled_student,
        )
        api_client.force_authenticate(user=enrolled_student)

        ok = api_client.patch(
            f"/api/v1/tasks/{task.id}/", {"status": "COMPLETED"}, format="json"
        )
        assert ok.status_code == 200

        bad = api_client.patch(
            f"/api/v1/tasks/{task.id}/", {"title": "Renamed by student"}, format="json"
        )
        assert bad.status_code == 403

    def test_student_only_sees_own_contributions(
        self, api_client, project, enrolled_student, student2_user
    ):
        ProjectMember.objects.create(project=project, student=enrolled_student)
        ProjectMember.objects.create(project=project, student=student2_user)
        ProjectContribution.objects.create(project=project, student=student2_user, description="Their work")
        ProjectContribution.objects.create(project=project, student=enrolled_student, description="My work")
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/projects/{project.id}/contributions/")
        assert [c["description"] for c in resp.json()["data"]] == ["My work"]

    def test_student_task_list_is_scoped_to_their_work(
        self, api_client, project, project_group, enrolled_student, student2_user
    ):
        mine = ProjectMember.objects.create(
            project=project, student=enrolled_student, group=project_group
        )
        theirs = ProjectMember.objects.create(project=project, student=student2_user)
        ProjectTask.objects.create(
            project=project, created_by=theirs.student, title="Group task", group=project_group
        )
        ProjectTask.objects.create(
            project=project, created_by=theirs.student, title="Private", assigned_student=student2_user
        )
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/projects/{project.id}/tasks/")
        titles = [t["title"] for t in resp.json()["data"]]
        assert titles == ["Group task"]

    def test_student_cannot_delete_a_project(self, api_client, project, enrolled_student):
        ProjectMember.objects.create(project=project, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.delete(f"/api/v1/projects/{project.id}/")
        assert resp.status_code == 403

    def test_lecturer_can_delete_own_project(self, staff_client, project):
        resp = staff_client.delete(f"/api/v1/projects/{project.id}/")
        assert resp.status_code == 204

    def test_sync_members_picks_up_late_enrollees(
        self, staff_client, offering, project, student2_user
    ):
        assert project.members.count() == 0
        Enrollment.objects.create(
            student=student2_user, course_offering=offering, status=Enrollment.Status.ACTIVE
        )
        resp = staff_client.post(f"/api/v1/projects/{project.id}/sync-members/")
        assert resp.status_code == 200
        assert resp.json()["data"]["added"] == 1
        assert project.members.count() == 1

    def test_offering_lecturer_sees_projects_they_do_not_supervise(
        self, api_client, project, taught_offering, lecturer_user, db
    ):
        other = User.objects.create_user(
            email="other_lect@test.edu", password="x",
            first_name="O", last_name="L", role="LECTURER",
        )
        project.supervisor = other
        project.created_by = other
        project.save()
        api_client.force_authenticate(user=lecturer_user)  # offering lecturer
        resp = api_client.get("/api/v1/projects/")
        assert any(p["id"] == str(project.id) for p in resp.json()["data"])


@pytest.mark.django_db
class TestGroupManagement:
    def test_group_leader_is_promoted_and_demoted(
        self, staff_client, class_wide_project, enrolled_student, student2_user
    ):
        a = ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        b = ProjectMember.objects.create(project=class_wide_project, student=student2_user)
        group = ProjectGroup.objects.create(project=class_wide_project, name="A")

        from apps.projects import services
        services.set_group_leader(group, enrolled_student)
        a.refresh_from_db(); b.refresh_from_db(); group.refresh_from_db()
        assert a.role == ProjectMember.Role.GROUP_LEADER
        assert b.role == ProjectMember.Role.MEMBER
        assert group.leader_id == enrolled_student.id

        services.set_group_leader(group, student2_user)
        a.refresh_from_db(); b.refresh_from_db()
        assert a.role == ProjectMember.Role.MEMBER
        assert b.role == ProjectMember.Role.GROUP_LEADER

    def test_deleting_a_group_keeps_the_students(
        self, staff_client, class_wide_project, enrolled_student
    ):
        member = ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        group = ProjectGroup.objects.create(project=class_wide_project, name="Doomed")
        member.group = group
        member.save(update_fields=["group"])

        resp = staff_client.delete(
            f"/api/v1/projects/{class_wide_project.id}/groups/{group.id}/"
        )
        assert resp.status_code == 204
        member.refresh_from_db()
        assert member.group_id is None  # orphaned, not deleted

    def test_group_serializer_lists_assigned_projects(
        self, staff_client, class_wide_project, enrolled_student
    ):
        group = ProjectGroup.objects.create(project=class_wide_project, name="A")
        Project.objects.create(
            course_offering=class_wide_project.course_offering,
            created_by=class_wide_project.created_by,
            supervisor=class_wide_project.supervisor,
            title="Sub project", scope=Project.Scope.GROUP_SPECIFIC, group=group,
        )
        resp = staff_client.get(f"/api/v1/projects/{class_wide_project.id}/groups/")
        row = next(g for g in resp.json()["data"] if g["id"] == str(group.id))
        assert [p["title"] for p in row["assigned_projects"]] == ["Sub project"]

    def test_lecturer_can_open_the_overview(
        self, staff_client, class_wide_project, enrolled_student
    ):
        member = ProjectMember.objects.create(project=class_wide_project, student=enrolled_student)
        group = ProjectGroup.objects.create(
            project=class_wide_project, name="A", leader=enrolled_student
        )
        member.group = group
        member.save(update_fields=["group"])
        ProjectTask.objects.create(
            project=class_wide_project, group=group, created_by=class_wide_project.created_by,
            title="Wire up", status="COMPLETED",
        )

        resp = staff_client.get(f"/api/v1/projects/{class_wide_project.id}/overview/")
        assert resp.status_code == 200
        row = resp.json()["data"]["groups"][0]
        assert row["name"] == "A"
        assert row["member_count"] == 1
        assert row["completed_tasks"] == 1
        assert row["completion_rate"] == 100


# ---------------------------------------------------------------------------
# Group leaders running their own group's work
# ---------------------------------------------------------------------------


@pytest.fixture
def spare_student(cs_department):
    """Factory for extra students, so a group has someone besides its leader."""

    def _make(n):
        user = User.objects.create_user(
            email=f"spare{n}@test.edu", password="test1234",
            first_name=f"Spare{n}", last_name="Student", role="STUDENT",
        )
        StudentProfile.objects.create(
            user=user, student_number=f"STU{n:03d}", department=cs_department
        )
        return user

    return _make


@pytest.fixture
def two_groups(class_wide_project, enrolled_student, student2_user, spare_student):
    """Two fully independent groups, each with a leader and a second member.

    Group A is led by ``enrolled_student``, Group B by ``student2_user``. The
    second member of each exists so a task can be assigned to somebody who is
    not the leader -- which is the whole point of letting leaders file work.
    """
    layout = {
        "A": {"leader": enrolled_student, "mate": spare_student(3)},
        "B": {"leader": student2_user, "mate": spare_student(4)},
    }
    for name, seats in layout.items():
        group = ProjectGroup.objects.create(
            project=class_wide_project, name=f"Group {name}", leader=seats["leader"]
        )
        ProjectMember.objects.create(
            project=class_wide_project, student=seats["leader"], group=group,
            role=ProjectMember.Role.GROUP_LEADER,
        )
        ProjectMember.objects.create(
            project=class_wide_project, student=seats["mate"], group=group
        )
        seats["group"] = group
    return layout


@pytest.mark.django_db
class TestGroupLeaderTaskAuthority:
    def test_leader_can_create_a_task_without_naming_a_group(
        self, api_client, class_wide_project, two_groups
    ):
        """Omitting the group is fine: there is only one they are allowed."""
        api_client.force_authenticate(user=two_groups["A"]["leader"])
        resp = api_client.post(
            f"/api/v1/projects/{class_wide_project.id}/tasks/",
            {"title": "Draft the schema", "priority": "HIGH"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        body = resp.json()["data"]
        assert body["group"] == str(two_groups["A"]["group"].id)
        assert body["created_by"] == str(two_groups["A"]["leader"].id)

    def test_leader_can_assign_the_task_to_their_own_member(
        self, api_client, class_wide_project, two_groups
    ):
        leader, mate = two_groups["A"]["leader"], two_groups["A"]["mate"]
        api_client.force_authenticate(user=leader)
        resp = api_client.post(
            f"/api/v1/projects/{class_wide_project.id}/tasks/",
            {"title": "Draw the ERD", "assigned_student": str(mate.id)},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["assignee_name"] == mate.get_full_name()

    def test_leader_cannot_file_into_another_group(
        self, api_client, class_wide_project, two_groups
    ):
        api_client.force_authenticate(user=two_groups["A"]["leader"])
        resp = api_client.post(
            f"/api/v1/projects/{class_wide_project.id}/tasks/",
            {"title": "Not mine", "group": str(two_groups["B"]["group"].id)},
            format="json",
        )
        assert resp.status_code == 403
        assert not ProjectTask.objects.filter(title="Not mine").exists()

    def test_leader_cannot_assign_to_a_student_in_another_group(
        self, api_client, class_wide_project, two_groups
    ):
        api_client.force_authenticate(user=two_groups["A"]["leader"])
        resp = api_client.post(
            f"/api/v1/projects/{class_wide_project.id}/tasks/",
            {"title": "Borrow a body", "assigned_student": str(two_groups["B"]["mate"].id)},
            format="json",
        )
        assert resp.status_code == 400
        assert "assigned_student" in resp.json()["error"]["details"]

    def test_leader_can_reassign_a_task_inside_their_group(
        self, api_client, class_wide_project, two_groups
    ):
        group, mate = two_groups["A"]["group"], two_groups["A"]["mate"]
        task = ProjectTask.objects.create(
            project=class_wide_project, group=group,
            created_by=class_wide_project.created_by, title="Draft the schema",
        )
        api_client.force_authenticate(user=two_groups["A"]["leader"])
        resp = api_client.patch(
            f"/api/v1/tasks/{task.id}/",
            {"title": "Draft the ERD", "assigned_student": str(mate.id)},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        task.refresh_from_db()
        assert task.title == "Draft the ERD"
        assert task.assigned_student_id == mate.id

    def test_leader_cannot_move_a_task_into_another_group(
        self, api_client, class_wide_project, two_groups
    ):
        task = ProjectTask.objects.create(
            project=class_wide_project, group=two_groups["A"]["group"],
            created_by=class_wide_project.created_by, title="Draft the schema",
        )
        api_client.force_authenticate(user=two_groups["A"]["leader"])
        resp = api_client.patch(
            f"/api/v1/tasks/{task.id}/",
            {"group": str(two_groups["B"]["group"].id)},
            format="json",
        )
        assert resp.status_code == 403
        task.refresh_from_db()
        assert task.group_id == two_groups["A"]["group"].id

    def test_leader_cannot_touch_another_groups_task(
        self, api_client, class_wide_project, two_groups
    ):
        task = ProjectTask.objects.create(
            project=class_wide_project, group=two_groups["B"]["group"],
            created_by=class_wide_project.created_by, title="Theirs",
        )
        api_client.force_authenticate(user=two_groups["A"]["leader"])
        resp = api_client.patch(
            f"/api/v1/tasks/{task.id}/", {"title": "Hijack"}, format="json"
        )
        assert resp.status_code == 403

    def test_leader_task_list_holds_only_their_own_group(
        self, api_client, class_wide_project, two_groups
    ):
        ProjectTask.objects.create(
            project=class_wide_project, group=two_groups["A"]["group"],
            created_by=class_wide_project.created_by, title="Ours",
        )
        ProjectTask.objects.create(
            project=class_wide_project, group=two_groups["B"]["group"],
            created_by=class_wide_project.created_by, title="Theirs",
        )
        api_client.force_authenticate(user=two_groups["A"]["leader"])
        resp = api_client.get(f"/api/v1/projects/{class_wide_project.id}/tasks/")
        assert [t["title"] for t in resp.json()["data"]] == ["Ours"]

    def test_ordinary_member_still_cannot_create_tasks(
        self, api_client, class_wide_project, two_groups
    ):
        """Leading is what opens the door; being in a group is not enough."""
        api_client.force_authenticate(user=two_groups["A"]["mate"])
        resp = api_client.post(
            f"/api/v1/projects/{class_wide_project.id}/tasks/", {"title": "Sneaky"}, format="json"
        )
        assert resp.status_code == 403

    def test_staff_cannot_assign_a_task_outside_its_group_either(
        self, staff_client, class_wide_project, two_groups
    ):
        resp = staff_client.post(
            f"/api/v1/projects/{class_wide_project.id}/tasks/",
            {
                "title": "Mismatched",
                "group": str(two_groups["A"]["group"].id),
                "assigned_student": str(two_groups["B"]["mate"].id),
            },
            format="json",
        )
        assert resp.status_code == 400
        assert "assigned_student" in resp.json()["error"]["details"]
