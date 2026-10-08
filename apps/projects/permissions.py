"""Access rules for the projects app.

Every project endpoint funnels through these helpers so that visibility is
decided in exactly one place. The rules:

* staff roles see everything;
* the supervisor, the offering lecturer and anyone who created the project may
  manage it;
* an enrolled student may only see projects they are a member of;
* the class delegate may manage *groups* inside a CLASS_WIDE project but never
  the project itself, its grades, or its membership roll;
* a group leader runs the work inside their own group: they may create tasks for
  it and reassign those tasks to their own members, and nothing outside it;
* per-group reports are staff/delegate-only -- students see their own work, not
  their classmates'.
"""
from django.db import models as db_models

from apps.core.permissions import ADMIN_ROLES, STAFF_ROLES

from .models import ClassDelegate, Project, ProjectGroup, ProjectMember


def is_admin(user):
    return user.is_authenticated and user.role in ADMIN_ROLES


def is_staff(user):
    return user.is_authenticated and user.role in STAFF_ROLES


def offering_lecturer_id(project):
    return project.course_offering.lecturer_id


def is_offering_lecturer(user, project):
    return user.is_authenticated and user.id == offering_lecturer_id(project)


def is_supervisor(user, project):
    return user.is_authenticated and (
        project.supervisor_id == user.id or project.created_by_id == user.id
    )


def is_class_delegate(user, project):
    """True when the user is the appointed delegate for this project's offering."""
    if not user.is_authenticated or user.role != "STUDENT":
        return False
    return ClassDelegate.objects.filter(
        course_offering_id=project.course_offering_id, student_id=user.id
    ).exists()


def is_group_leader(user, project, group=None):
    """True when the user holds GROUP_LEADER in this project.

    The membership row is the source of truth rather than ``ProjectGroup.leader``:
    that pointer is a convenience copy, and a leader is only real for as long as
    the role sits on the membership. Passing ``group`` narrows the question to
    one specific group, which is what the "own group only" rule needs.
    """
    if not user.is_authenticated or user.role != "STUDENT":
        return False
    qs = ProjectMember.objects.filter(
        project=project, student=user, role=ProjectMember.Role.GROUP_LEADER
    )
    if group is not None:
        qs = qs.filter(group=group)
    return qs.exists()


def led_groups(user, project):
    """The groups this student leads, in this project."""
    if not user.is_authenticated or user.role != "STUDENT":
        return ProjectGroup.objects.none()
    return ProjectGroup.objects.filter(
        id__in=ProjectMember.objects.filter(
            project=project, student=user, role=ProjectMember.Role.GROUP_LEADER
        )
        .exclude(group=None)
        .values_list("group_id", flat=True)
    )


def is_member(user, project):
    if not user.is_authenticated:
        return False
    return ProjectMember.objects.filter(project=project, student_id=user.id).exists()


def can_view_project(user, project):
    """May the user open this project at all?"""
    if not user.is_authenticated:
        return False
    return (
        is_admin(user)
        or is_supervisor(user, project)
        or is_offering_lecturer(user, project)
        or is_class_delegate(user, project)
        or is_member(user, project)
    )


def can_manage_project(user, project):
    """May the user edit project settings, tasks, milestones and grades?"""
    if not user.is_authenticated:
        return False
    return is_admin(user) or is_supervisor(user, project) or is_offering_lecturer(user, project)


def can_manage_groups(user, project):
    """May the user create/rename/delete groups and move students between them?

    A CLASS_WIDE project may be delegated to the class rep. Group-assigned and
    individual projects are always staff-only, because their membership is
    fixed by the staff who created them.
    """
    if can_manage_project(user, project):
        return True
    if project.scope == Project.Scope.CLASS_WIDE and is_class_delegate(user, project):
        return True
    return False


def can_view_group_report(user, project, group):
    """Full per-group breakdown: members, contributions, progress.

    Deliberately excludes ordinary students, who would otherwise read their
    classmates' contribution records.
    """
    if not user.is_authenticated:
        return False
    if is_admin(user) or is_supervisor(user, project) or is_offering_lecturer(user, project):
        return True
    return project.scope == Project.Scope.CLASS_WIDE and is_class_delegate(user, project)


def can_create_task(user, project, group=None):
    """May the user add a task to this project, into ``group``?

    Staff may create anywhere. A group leader may create inside the group they
    lead -- and only that group. ``group`` of None means "no group named", which
    for a group leader is a request to be placed in one they run.
    """
    if can_manage_project(user, project):
        return True
    if group is not None:
        return is_group_leader(user, project, group)
    return is_group_leader(user, project)


def can_edit_task_fields(user, task):
    """May the user change what a task *is*, as opposed to just ticking it off?

    Staff may edit anything. A group leader may retitle, re-date and reassign a
    task inside the group they lead, which is what makes them able to run their
    own group's work. An ordinary member only ever moves the status.
    """
    if can_manage_project(user, task.project):
        return True
    if task.group_id is None:
        return False
    return is_group_leader(user, task.project, task.group)


def can_edit_task(user, task):
    """Staff may edit anything; a student may only move their own task's status."""
    project = task.project
    if can_manage_project(user, project):
        return True
    if not user.is_authenticated:
        return False
    if task.assigned_student_id == user.id:
        return True
    if task.group_id:
        return ProjectMember.objects.filter(
            project=project, student_id=user.id, group_id=task.group_id
        ).exists()
    return False


def can_complete_task(user, task):
    if not user.is_authenticated:
        return False
    if can_manage_project(user, task.project):
        return True
    if task.assigned_student_id == user.id:
        return True
    if task.group_id:
        return ProjectMember.objects.filter(
            project=task.project, student_id=user.id, group_id=task.group_id
        ).exists()
    return False


def can_view_task_list(user, project):
    if can_view_project(user, project):
        return True
    return False


def can_record_assessment(user, project):
    """Only staff may create assessment components and enter scores."""
    return is_admin(user) or is_supervisor(user, project) or is_offering_lecturer(user, project)


def visible_projects(user):
    """Projects the user is allowed to see in the list view."""
    qs = Project.objects.select_related(
        "course_offering", "course_offering__course", "supervisor"
    )
    if not user.is_authenticated:
        return qs.none()
    if user.role in ADMIN_ROLES:
        return qs
    if user.role == "LECTURER":
        return qs.filter(
            db_models.Q(supervisor=user)
            | db_models.Q(created_by=user)
            | db_models.Q(course_offering__lecturer=user)
        )
    if user.role == "STUDENT":
        member_ids = ProjectMember.objects.filter(student=user).values_list("project_id", flat=True)
        delegate_ids = ClassDelegate.objects.filter(student=user).values_list(
            "course_offering_id", flat=True
        )
        return qs.filter(
            db_models.Q(id__in=member_ids) | db_models.Q(course_offering_id__in=delegate_ids)
        )
    return qs.none()


def groups_of(user, project):
    """Groups the user may see.

    Students see only their own group; staff and the delegate see all of them.
    """
    if can_manage_groups(user, project):
        return project.groups.all()
    if not user.is_authenticated:
        return ProjectGroup.objects.none()
    return project.groups.filter(members__student_id=user.id).distinct()


def forbid(message, code="FORBIDDEN"):
    from rest_framework import status
    from rest_framework.response import Response

    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status.HTTP_403_FORBIDDEN,
    )
