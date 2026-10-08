"""Project management views (API Spec doc 07 §§38-43)."""
from django.core.exceptions import ValidationError
from django.db import models as db_models
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StudentProfile, User
from apps.audit.services import audit
from apps.core.permissions import ADMIN_ROLES

from . import permissions as perms
from . import services
from .models import (
    AssessmentComponent,
    AssessmentRecord,
    ClassDelegate,
    Project,
    ProjectContribution,
    ProjectDocument,
    ProjectGroup,
    ProjectMember,
    ProjectMilestone,
    ProjectTask,
)
from .serializers import (
    AssessmentComponentSerializer,
    AssessmentRecordSerializer,
    ClassDelegateSerializer,
    ProjectContributionSerializer,
    ProjectDocumentSerializer,
    ProjectGroupSerializer,
    ProjectMemberSerializer,
    ProjectMilestoneSerializer,
    ProjectSerializer,
    ProjectTaskSerializer,
    StudentOptionSerializer,
)


def _is_supervisor(project, user):
    """Project supervisor or any admin role may manage a project (BR-072)."""
    return perms.can_manage_project(user, project)


def _visible_project(request, project_id):
    """Fetch a project the caller is allowed to see, or return a 403/404 pair."""
    project = get_object_or_404(
        Project.objects.select_related("course_offering", "course_offering__course", "group"),
        id=project_id,
    )
    if not perms.can_view_project(request.user, project):
        return None, perms.forbid("You do not have access to this project.")
    return project, None


def _managed_project(request, project_id):
    project, denied = _visible_project(request, project_id)
    if denied is not None:
        return None, denied
    if not perms.can_manage_project(request.user, project):
        return None, perms.forbid("Only the project supervisor or the course lecturer can do that.")
    return project, None


def _grouped_project(request, project_id):
    project, denied = _visible_project(request, project_id)
    if denied is not None:
        return None, denied
    if not perms.can_manage_groups(request.user, project):
        return None, perms.forbid(
            "Only the supervisor, the course lecturer or the class delegate can manage groups."
        )
    return project, None


class ProjectListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = perms.visible_projects(request.user)
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        scope_filter = request.query_params.get("scope")
        if scope_filter:
            qs = qs.filter(scope=scope_filter.upper())
        offering_filter = request.query_params.get("course_offering")
        if offering_filter:
            qs = qs.filter(course_offering_id=offering_filter)
        return Response(ProjectSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN", "LECTURER"}:
            return perms.forbid("Only staff can create projects.")
        s = ProjectSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        project = s.save(created_by=request.user, supervisor=request.user)

        # A project assigned to a group must not point at its own group, and the
        # group must belong to this same project.
        if project.group_id:
            try:
                project.full_clean(exclude=["course_offering", "created_by", "supervisor"])
            except ValidationError as exc:
                return Response(
                    {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "; ".join(exc.messages)}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        audit(user=request.user, action="PROJECT_CREATED", resource_type="Project", resource_id=project.id, request=request)

        # INDIVIDUAL and CLASS_WIDE both mean "every enrolled student takes part",
        # so the roster is materialised up front. GROUP_SPECIFIC inherits its
        # members from the group it was assigned to.
        if project.scope in (Project.Scope.INDIVIDUAL, Project.Scope.CLASS_WIDE):
            services.sync_membership(project)
        elif project.group_id:
            for member in project.group.members.select_related("student"):
                ProjectMember.objects.get_or_create(
                    project=project,
                    student=member.student,
                    defaults={"group": project.group, "role": member.role},
                )
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        return Response(ProjectSerializer(project).data)

    def patch(self, request, project_id):
        project, denied = _managed_project(request, project_id)
        if denied is not None:
            return denied
        s = ProjectSerializer(project, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)

    def delete(self, request, project_id):
        project, denied = _managed_project(request, project_id)
        if denied is not None:
            return denied
        project.delete()
        audit(user=request.user, action="PROJECT_DELETED", resource_type="Project", resource_id=project_id, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectOverviewView(APIView):
    """GET /api/v1/projects/{project_id}/overview/

    The lecturer's "every group at a glance" screen: one row per group with
    member counts, task progress and contribution totals, plus the unassigned
    students who still need placing.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        if not perms.can_view_group_report(request.user, project, None):
            return perms.forbid("Only the supervisor, the course lecturer or the class delegate can see the group overview.")

        groups = project.groups.prefetch_related("members__student", "tasks").order_by("name")
        rows = []
        for g in groups:
            tasks = g.tasks.all()
            total = tasks.count()
            done = tasks.filter(status=ProjectTask.Status.COMPLETED).count()
            rows.append({
                "group_id": str(g.id),
                "name": g.name,
                "leader_name": g.leader.get_full_name() if g.leader_id else "",
                "member_count": g.members.count(),
                "members": [
                    {
                        "id": str(m.student_id),
                        "name": m.student.get_full_name(),
                        "role": m.role,
                    }
                    for m in g.members.select_related("student")
                ],
                "total_tasks": total,
                "completed_tasks": done,
                "completion_rate": round(done / total * 100) if total else 0,
                "contribution_count": project.contributions.filter(
                    student__in=[m.student_id for m in g.members.all()]
                ).count(),
                "assigned_projects": [
                    {"id": str(p.id), "title": p.title, "status": p.status}
                    for p in g.assigned_projects.all()
                ],
            })

        unassigned = []
        if project.scope == Project.Scope.CLASS_WIDE:
            unassigned = StudentOptionSerializer(
                services.unassigned_students(project), many=True
            ).data

        return Response({
            "project": ProjectSerializer(project).data,
            "scope": project.scope,
            "group_count": len(rows),
            "groups": rows,
            "unassigned": unassigned,
            "summary": {
                "member_count": project.members.count(),
                "unassigned_count": len(unassigned),
                "total_tasks": project.tasks.count(),
                "completed_tasks": project.tasks.filter(status=ProjectTask.Status.COMPLETED).count(),
            },
        })


class ProjectGroupsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        return Response(
            ProjectGroupSerializer(perms.groups_of(request.user, project), many=True).data
        )

    def post(self, request, project_id):
        project, denied = _grouped_project(request, project_id)
        if denied is not None:
            return denied
        if project.scope != Project.Scope.CLASS_WIDE:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR",
                 "message": "Only a class-wide project has groups. Create a class-wide project, or assign this project to a group."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = request.data.copy()
        data["project"] = project.id
        s = ProjectGroupSerializer(data=data)
        s.is_valid(raise_exception=True)
        group = s.save()
        return Response(ProjectGroupSerializer(group).data, status=status.HTTP_201_CREATED)


class ProjectGroupDetailView(APIView):
    """PATCH/DELETE a single group (name, description, leader)."""

    permission_classes = [IsAuthenticated]

    def _get(self, request, project_id, group_id):
        project, denied = _grouped_project(request, project_id)
        if denied is not None:
            return None, None, denied
        group = get_object_or_404(ProjectGroup, id=group_id, project=project)
        return project, group, None

    def patch(self, request, project_id, group_id):
        project, group, denied = self._get(request, project_id, group_id)
        if denied is not None:
            return denied
        data = request.data.copy()
        leader_id = data.pop("leader", None)
        s = ProjectGroupSerializer(group, data=data, partial=True)
        s.is_valid(raise_exception=True)
        group = s.save()
        if leader_id is not None or "leader" in request.data:
            leader = User.objects.filter(id=leader_id).first() if leader_id else None
            try:
                group = services.set_group_leader(group, leader)
            except ValueError as exc:
                return Response(
                    {"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(exc)}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(ProjectGroupSerializer(group).data)

    def delete(self, request, project_id, group_id):
        project, group, denied = self._get(request, project_id, group_id)
        if denied is not None:
            return denied
        ProjectMember.objects.filter(group=group).update(group=None)
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectGroupMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id, group_id):
        project, denied = _grouped_project(request, project_id)
        if denied is not None:
            return denied
        group = get_object_or_404(ProjectGroup, id=group_id, project=project)
        student_id = request.data.get("student_id")
        role = request.data.get("role", "MEMBER")
        if role not in dict(ProjectMember.Role.choices):
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": f"Invalid role. Choose from {list(dict(ProjectMember.Role.choices))}."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        student = User.objects.filter(id=student_id, role="STUDENT").first()
        if student is None:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Unknown student."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # BR-101: students must be enrolled in the project's course offering.
        if not project.course_offering.enrollments.filter(student=student, status="ACTIVE").exists():
            return perms.forbid("Student is not enrolled in this course (BR-101).")
        if ProjectMember.objects.filter(project=project, student_id=student_id).exists():
            return Response(
                {"success": False, "error": {"code": "CONFLICT", "message": "Student is already a member of this project."}},
                status=status.HTTP_409_CONFLICT,
            )
        member = ProjectMember.objects.create(project=project, student_id=student_id, group=group, role=role)
        if role == ProjectMember.Role.GROUP_LEADER:
            group.leader = student
            group.save(update_fields=["leader", "updated_at"])
        return Response(ProjectMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    def delete(self, request, project_id, group_id, student_id):
        project, denied = _grouped_project(request, project_id)
        if denied is not None:
            return denied
        member = get_object_or_404(ProjectMember, project=project, student_id=student_id)
        group_id = member.group_id
        member.delete()
        if group_id:
            group = ProjectGroup.objects.filter(id=group_id).first()
            if group and group.leader_id is None:
                nxt = group.members.order_by("pk").first()
                if nxt:
                    group.leader = nxt.student
                    nxt.role = ProjectMember.Role.GROUP_LEADER
                    nxt.save(update_fields=["role", "updated_at"])
                    group.save(update_fields=["leader", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectUnassignedView(APIView):
    """GET /api/v1/projects/{project_id}/unassigned/ — the 'Unassigned' bucket."""

    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        if not perms.can_manage_groups(request.user, project):
            return perms.forbid("Only the supervisor, the course lecturer or the class delegate can see unassigned students.")
        return Response(
            StudentOptionSerializer(services.unassigned_students(project), many=True).data
        )


class ProjectSyncMembersView(APIView):
    """POST /api/v1/projects/{project_id}/sync-members/

    Re-materialise membership from the class roster so students who enrolled
    after the project was created get included.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, denied = _managed_project(request, project_id)
        if denied is not None:
            return denied
        created = services.sync_membership(project)
        return Response({"added": created, "project": ProjectSerializer(project).data})


class ProjectTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        tasks = project.tasks.all()
        if not perms.can_manage_project(request.user, project):
            # A student only sees work assigned to them or to their group.
            member_groups = ProjectMember.objects.filter(
                project=project, student=request.user
            ).values_list("group_id", flat=True)
            tasks = tasks.filter(
                db_models.Q(assigned_student=request.user)
                | db_models.Q(group_id__in=[g for g in member_groups if g])
            )
        return Response(ProjectTaskSerializer(tasks, many=True).data)

    def post(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied

        data = request.data.copy()
        data["project"] = project.id
        data["created_by"] = request.user.id

        # Staff may file a task anywhere. A group leader may only file into the
        # group they lead, and when they name no group we place it there for
        # them rather than making them pick the one value they are allowed to
        # pick.
        if not perms.can_manage_project(request.user, project):
            led = perms.led_groups(request.user, project)
            if not led.exists():
                return perms.forbid(
                    "Only the project supervisor, the course lecturer or a group leader can create tasks."
                )
            named = data.get("group") or None
            if named:
                try:
                    allowed = led.filter(id=named).exists()
                except (ValueError, ValidationError):
                    allowed = False  # not a uuid; the serializer reports that
                if not allowed:
                    return perms.forbid("You can only create tasks for a group you lead.")
            else:
                if led.count() > 1:
                    return Response(
                        {"success": False, "error": {"code": "VALIDATION_ERROR",
                         "message": "You lead more than one group. Name the group this task is for."}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                data["group"] = str(led.values_list("id", flat=True)[0])

        s = ProjectTaskSerializer(data=data)
        s.is_valid(raise_exception=True)
        task = s.save()
        return Response(ProjectTaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id):
        task = get_object_or_404(ProjectTask, id=task_id)
        if not perms.can_edit_task(request.user, task):
            return perms.forbid("You cannot edit this task.")
        # A student may only move the status, never reassign or retitle. The
        # exception is a group leader working on their own group's task, who is
        # running that group's work and needs to retitle and reassign it.
        if not perms.can_edit_task_fields(request.user, task):
            illegal = set(request.data) - {"status"}
            if illegal:
                return Response(
                    {"success": False, "error": {"code": "FORBIDDEN",
                     "message": f"Students may only change the status. Not allowed: {', '.join(sorted(illegal))}."}},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif not perms.can_manage_project(request.user, task.project):
            # They may reshape the task, but not smuggle it out of their group.
            moved = request.data.get("group")
            if moved and str(moved) != str(task.group_id):
                return perms.forbid("You can only move tasks inside the group you lead.")
        old_status = task.status
        s = ProjectTaskSerializer(task, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        task = s.save()
        if old_status != task.status and task.status == "COMPLETED":
            ProjectContribution.objects.get_or_create(
                project=task.project,
                student=task.assigned_student or request.user,
                task=task,
                defaults={
                    "description": f"Completed task: {task.title}",
                    "contribution_type": "TASK_COMPLETION",
                },
            )
        return Response(ProjectTaskSerializer(task).data)


class TaskCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        task = get_object_or_404(ProjectTask, id=task_id)
        if not perms.can_complete_task(request.user, task):
            return perms.forbid("You cannot complete this task.")
        task.status = "COMPLETED"
        task.save(update_fields=["status", "updated_at"])
        ProjectContribution.objects.get_or_create(
            project=task.project,
            student=task.assigned_student or request.user,
            task=task,
            defaults={"description": f"Completed task: {task.title}", "contribution_type": "TASK_COMPLETION"},
        )
        return Response(ProjectTaskSerializer(task).data)


class ProjectContributionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        qs = project.contributions.all()
        if not perms.can_manage_project(request.user, project) and not perms.is_class_delegate(request.user, project):
            # Students see only their own evidence of participation.
            qs = qs.filter(student=request.user)
        return Response(ProjectContributionSerializer(qs, many=True).data)

    def post(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        if not perms.is_member(request.user, project) and not perms.can_manage_project(request.user, project):
            return perms.forbid("You are not a member of this project.")
        data = request.data.copy()
        data["project"] = project.id
        data["student"] = request.user.id
        s = ProjectContributionSerializer(data=data)
        s.is_valid(raise_exception=True)
        contribution = s.save()
        return Response(ProjectContributionSerializer(contribution).data, status=status.HTTP_201_CREATED)


class ProjectDocumentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        return Response(ProjectDocumentSerializer(project.documents.all(), many=True).data)

    def post(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        if not perms.is_member(request.user, project) and not perms.can_manage_project(request.user, project):
            return perms.forbid("You are not a member of this project.")
        data = request.data.copy()
        data["project"] = project.id
        data["uploaded_by"] = request.user.id
        s = ProjectDocumentSerializer(data=data)
        s.is_valid(raise_exception=True)
        doc = s.save()
        return Response(ProjectDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class ProjectAssessmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        components = project.assessment_components.all()
        if perms.can_manage_project(request.user, project):
            return Response(AssessmentComponentSerializer(components, many=True).data)
        if request.user.role != "STUDENT":
            return perms.forbid("Only project members and staff can view project assessments.")

        is_member = perms.is_member(request.user, project)
        if not is_member or perms.is_class_delegate(request.user, project):
            return perms.forbid("Only project members can view their own finalized assessment records.")
        result = []
        for component in components:
            item = AssessmentComponentSerializer(component).data
            record = component.records.filter(
                student=request.user,
                status=AssessmentRecord.Status.FINALIZED,
            ).first()
            item["my_record"] = AssessmentRecordSerializer(record).data if record else None
            result.append(item)
        return Response(result)

    def post(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        if not perms.can_record_assessment(request.user, project):
            return perms.forbid("Only staff can create assessments.")
        data = request.data.copy()
        data["project"] = project.id
        s = AssessmentComponentSerializer(data=data)
        s.is_valid(raise_exception=True)
        component = s.save()
        return Response(AssessmentComponentSerializer(component).data, status=status.HTTP_201_CREATED)


class AssessmentRecordsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, assessment_id):
        component = get_object_or_404(AssessmentComponent, id=assessment_id)
        if not perms.can_record_assessment(request.user, component.project):
            return perms.forbid("Only staff can record assessments.")
        data = request.data.copy()
        data["assessment_component"] = component.id
        data["assessor"] = request.user.id
        s = AssessmentRecordSerializer(data=data)
        s.is_valid(raise_exception=True)
        record = s.save()
        audit(user=request.user, action="ASSESSMENT_CREATED", resource_type="AssessmentRecord", resource_id=record.id, request=request)
        return Response(AssessmentRecordSerializer(record).data, status=status.HTTP_201_CREATED)


class ProjectArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = perms.visible_projects(request.user).filter(status=Project.Status.ARCHIVED)
        return Response(ProjectSerializer(qs, many=True).data)


class GroupReportView(APIView):
    """GET /api/v1/projects/{project_id}/groups/{group_id}/report

    Supervisor report for a group: member breakdown, task stats,
    contributions and documents.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, project_id, group_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        group = get_object_or_404(ProjectGroup, id=group_id, project=project)
        # A per-group breakdown exposes every member's contributions, so it is
        # restricted to staff and the class delegate.
        if not perms.can_view_group_report(request.user, project, group):
            return perms.forbid("Only the supervisor, the course lecturer or the class delegate can read a group report.")
        members = group.members.select_related("student")
        tasks = group.tasks.all()
        contributions = project.contributions.filter(student__in=[m.student_id for m in members])

        member_stats = []
        for m in members:
            assigned = tasks.filter(assigned_student=m.student)
            completed = assigned.filter(status=ProjectTask.Status.COMPLETED).count()
            member_stats.append({
                "member_id": m.id,
                "student_id": str(m.student_id),
                "student_name": m.student.get_full_name(),
                "email": m.student.email,
                "role": m.role,
                "tasks_assigned": assigned.count(),
                "tasks_completed": completed,
                "contributions": contributions.filter(student_id=m.student_id).count(),
            })

        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status=ProjectTask.Status.COMPLETED).count()
        in_progress = tasks.filter(status=ProjectTask.Status.IN_PROGRESS).count()
        todo = tasks.filter(status=ProjectTask.Status.TODO).count()

        return Response({
            "group": ProjectGroupSerializer(group).data,
            "project": {"id": str(project.id), "title": project.title, "course_code": project.course_offering.course.code, "status": project.status},
            "summary": {
                "member_count": members.count(),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress,
                "todo_tasks": todo,
                "completion_rate": round(completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
                "contribution_count": contributions.count(),
                "document_count": project.documents.count(),
            },
            "members": member_stats,
            "recent_contributions": ProjectContributionSerializer(contributions[:10], many=True).data,
            "tasks": ProjectTaskSerializer(tasks, many=True).data,
        })


class OfferingGroupsView(APIView):
    """GET /course-offerings/{offering_id}/groups/

    Every group across every project in the offering, so the lecturer can pick
    a group when assigning a project to it.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, offering_id):
        from apps.academics.models import CourseOffering

        offering = get_object_or_404(CourseOffering, id=offering_id)
        if not (request.user.role in ADMIN_ROLES or offering.lecturer_id == request.user.id):
            return perms.forbid("Only the course lecturer or an admin can list the groups of this course.")
        groups = (
            ProjectGroup.objects.filter(project__course_offering=offering)
            .select_related("project", "leader")
            .prefetch_related("members")
            .order_by("project__title", "name")
        )
        return Response([
            {
                "id": str(g.id),
                "name": g.name,
                "project_id": str(g.project_id),
                "project_title": g.project.title,
                "project_scope": g.project.scope,
                "leader_name": g.leader.get_full_name() if g.leader_id else "",
                "member_count": g.members.count(),
            }
            for g in groups
        ])


class ProjectMilestonesView(APIView):
    """GET/POST /projects/{project_id}/milestones/ (FR-83)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _visible_project(request, project_id)
        if denied is not None:
            return denied
        return Response(ProjectMilestoneSerializer(project.milestones.all(), many=True).data)

    def post(self, request, project_id):
        project, denied = _managed_project(request, project_id)
        if denied is not None:
            return denied
        data = request.data.copy()
        data["project"] = project.id
        s = ProjectMilestoneSerializer(data=data)
        s.is_valid(raise_exception=True)
        milestone = s.save()
        audit(user=request.user, action="MILESTONE_CREATED", resource_type="ProjectMilestone", resource_id=milestone.id, request=request)
        return Response(ProjectMilestoneSerializer(milestone).data, status=status.HTTP_201_CREATED)


class ClassDelegateView(APIView):
    """GET/POST /course-offerings/{offering_id}/delegate/

    One class delegate per course offering, appointed by the offering lecturer
    or an admin. A delegate may form groups inside a CLASS_WIDE project.
    """

    permission_classes = [IsAuthenticated]

    @staticmethod
    def _may_appoint(request, offering):
        return (
            request.user.role in ADMIN_ROLES
            or offering.lecturer_id == request.user.id
        )

    def get(self, request, offering_id):
        from apps.academics.models import CourseOffering

        offering = get_object_or_404(CourseOffering, id=offering_id)
        delegate = services.get_delegate(offering)
        if delegate is None:
            return Response({"course_offering": str(offering.id), "student": None,
                             "student_name": "", "is_delegate": False})
        is_self = delegate.student_id == request.user.id
        can_see = self._may_appoint(request, offering) or is_self
        if not can_see:
            return perms.forbid("You cannot view this course's delegate.")
        return Response({
            "id": str(delegate.id),
            "course_offering": str(offering.id),
            "student": str(delegate.student_id) if delegate.student_id else None,
            "student_name": delegate.student.get_full_name() if delegate.student else "",
            "student_number": (
                delegate.student.student_profile.student_number
                if delegate.student_id and hasattr(delegate.student, "student_profile")
                and delegate.student.student_profile else ""
            ),
            "appointed_by_name": delegate.appointed_by.get_full_name() if delegate.appointed_by else "",
            "is_delegate": is_self,
        })

    def post(self, request, offering_id):
        from apps.academics.models import CourseOffering

        offering = get_object_or_404(CourseOffering, id=offering_id)
        if not self._may_appoint(request, offering):
            return perms.forbid("Only the course lecturer or an admin can appoint the class delegate.")
        student_id = request.data.get("student")
        student = User.objects.filter(id=student_id, role="STUDENT").first() if student_id else None
        if student_id and student is None:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Unknown student."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            delegate = services.appoint_delegate(offering, student, request.user)
        except ValueError as exc:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(exc)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        audit(user=request.user, action="DELEGATE_APPOINTED", resource_type="CourseOffering",
              resource_id=offering.id, request=request)
        return Response(ClassDelegateSerializer(delegate).data, status=status.HTTP_201_CREATED)

    def delete(self, request, offering_id):
        from apps.academics.models import CourseOffering

        offering = get_object_or_404(CourseOffering, id=offering_id)
        if not self._may_appoint(request, offering):
            return perms.forbid("Only the course lecturer or an admin can remove the class delegate.")
        ClassDelegate.objects.filter(course_offering=offering).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OfferingDelegateCandidatesView(APIView):
    """GET /course-offerings/{offering_id}/delegate-candidates/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, offering_id):
        from apps.academics.models import CourseOffering

        offering = get_object_or_404(CourseOffering, id=offering_id)
        if not (request.user.role in ADMIN_ROLES or offering.lecturer_id == request.user.id):
            return perms.forbid("Only the course lecturer or an admin can pick a delegate.")
        students = (
            User.objects.filter(role="STUDENT")
            .filter(enrollments__course_offering=offering, enrollments__status="ACTIVE")
            .select_related("student_profile")
            .distinct()
        )
        return Response(StudentOptionSerializer(students, many=True).data)


class ProjectMilestoneDetailView(APIView):
    """PATCH/DELETE /projects/milestones/{milestone_id}/ (FR-83)."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, milestone_id):
        milestone = get_object_or_404(ProjectMilestone, id=milestone_id)
        if not _is_supervisor(milestone.project, request.user):
            return perms.forbid("Only the supervisor or the course lecturer can change milestones.")
        s = ProjectMilestoneSerializer(milestone, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)

    def delete(self, request, milestone_id):
        milestone = get_object_or_404(ProjectMilestone, id=milestone_id)
        if not _is_supervisor(milestone.project, request.user):
            return perms.forbid("Only the supervisor or the course lecturer can delete milestones.")
        milestone.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectCandidatesView(APIView):
    """GET /projects/{project_id}/candidates/

    Enrolled (ACTIVE) students of the project's course offering that are
    not yet project members — powers the supervisor's member picker.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, denied = _managed_project(request, project_id)
        if denied is not None:
            return denied
        member_ids = ProjectMember.objects.filter(project=project).values_list("student_id", flat=True)
        students = (
            User.objects.filter(role="STUDENT")
            .filter(enrollments__course_offering=project.course_offering, enrollments__status="ACTIVE")
            .exclude(id__in=member_ids)
            .select_related("student_profile")
            .distinct()
        )
        return Response(StudentOptionSerializer(students, many=True).data)
