"""Project membership and grouping rules.

Kept out of the views so that auto-enrolment and the delegate workflow behave
identically no matter which endpoint triggers them.
"""
from django.db import transaction

from apps.accounts.models import User

from .models import ClassDelegate, Project, ProjectGroup, ProjectMember


def enrolled_students(project):
    """ACTIVE-enrolled students of the project's offering."""
    return (
        User.objects.filter(role="STUDENT")
        .filter(
            enrollments__course_offering=project.course_offering,
            enrollments__status="ACTIVE",
        )
        .distinct()
    )


@transaction.atomic
def sync_membership(project, added=None, removed=None):
    """Reconcile ProjectMember rows with the class roster.

    ``added``/``removed`` let a caller opt specific students in or out; anything
    already recorded is left alone. Returns the number of rows created.
    """
    created = 0
    roster = enrolled_students(project)

    if added is None and removed is None:
        # Full sync: everybody enrolled becomes a member, nobody is dropped.
        existing = set(
            ProjectMember.objects.filter(project=project).values_list("student_id", flat=True)
        )
        for student in roster:
            if student.id in existing:
                continue
            ProjectMember.objects.create(project=project, student=student, role=ProjectMember.Role.MEMBER)
            created += 1
        return created

    for student in roster:
        if removed and student.id in {r.id for r in removed}:
            continue
        if added and student.id not in {a.id for a in added}:
            continue
        _member, made = ProjectMember.objects.get_or_create(
            project=project, student=student, defaults={"role": ProjectMember.Role.MEMBER}
        )
        created += int(made)

    if removed:
        ProjectMember.objects.filter(
            project=project, student__in=[r.id for r in removed]
        ).delete()

    return created


@transaction.atomic
def sync_student_memberships_for_offering(student, offering):
    """Add a newly enrolled student to existing individual/class-wide projects.

    Group-specific projects keep their deliberately selected membership.
    """
    projects = Project.objects.filter(
        course_offering=offering,
        scope__in=[Project.Scope.INDIVIDUAL, Project.Scope.CLASS_WIDE],
    )
    created = 0
    for project in projects:
        _member, was_created = ProjectMember.objects.get_or_create(
            project=project,
            student=student,
            defaults={"role": ProjectMember.Role.MEMBER},
        )
        created += int(was_created)
    return created


def unassigned_students(project):
    """Enrolled students who are not yet in any group of this project.

    This is what the lecturer's 'Unassigned' bucket renders.
    """
    grouped = set(
        ProjectMember.objects.filter(project=project)
        .exclude(group__isnull=True)
        .values_list("student_id", flat=True)
    )
    return [s for s in enrolled_students(project) if s.id not in grouped]


@transaction.atomic
def set_group_leader(group, student):
    """Promote one member to group leader, demoting the previous one.

    A project member who is not yet in any group is moved into this group
    rather than rejected, so a delegate can appoint a leader in one step.
    """
    if student is not None:
        member = ProjectMember.objects.filter(project=group.project, student=student).first()
        if member is None:
            raise ValueError("That student is not a member of this project.")
        if member.group_id is None:
            member.group = group
            member.save(update_fields=["group", "updated_at"])
        elif member.group_id != group.id:
            raise ValueError("That student already belongs to a different group.")
        ProjectMember.objects.filter(project=group.project, group=group).exclude(
            pk=member.pk
        ).update(role=ProjectMember.Role.MEMBER)
        member.role = ProjectMember.Role.GROUP_LEADER
        member.save(update_fields=["role", "updated_at"])
    else:
        ProjectMember.objects.filter(project=group.project, group=group).update(
            role=ProjectMember.Role.MEMBER
        )
    group.leader = student
    group.save(update_fields=["leader", "updated_at"])
    return group


def get_delegate(offering):
    """Return the ClassDelegate row for an offering, or None."""
    return ClassDelegate.objects.filter(course_offering=offering).select_related("student").first()


def appoint_delegate(offering, student, appointed_by):
    """One delegate per offering; appointing again replaces the previous holder."""
    if student is not None and not enrolled_students_for_offering(offering, student):
        raise ValueError("The delegate must be an actively enrolled student.")
    delegate, _ = ClassDelegate.objects.update_or_create(
        course_offering=offering, defaults={"student": student, "appointed_by": appointed_by}
    )
    return delegate


def enrolled_students_for_offering(offering, student):
    return student.enrollments.filter(course_offering=offering, status="ACTIVE").exists()


def groups_required_for(project):
    """CLASS_WIDE is the only scope where groups carry the work."""
    return project.scope == Project.Scope.CLASS_WIDE


def default_group_name(index):
    return f"Group {index}"


def create_group(project, name, description="", leader=None):
    return ProjectGroup.objects.create(
        project=project, name=name, description=description, leader=leader
    )
