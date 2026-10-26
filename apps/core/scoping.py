"""Server-side boundaries for administrators assigned to an academic unit.

Legacy faculty and department admins without an assignment fail closed until a
system admin assigns their scope. Public academic catalogue reads are separate
from the administrative queries that use these helpers.
"""
from django.db.models import Q


ADMIN_ROLES = {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}


def is_admin(user):
    if not user or not user.is_authenticated:
        return False
    if user.role == "SYSTEM_ADMIN":
        return True
    if user.role == "FACULTY_ADMIN":
        return bool(user.admin_faculty_id)
    if user.role == "DEPARTMENT_ADMIN":
        return bool(user.admin_department_id)
    return False


def can_administer_faculty(user, faculty):
    if not is_admin(user) or faculty is None:
        return False
    return user.role == "SYSTEM_ADMIN" or (
        user.role == "FACULTY_ADMIN" and user.admin_faculty_id == faculty.id
    )


def can_administer_department(user, department):
    if not is_admin(user) or department is None:
        return False
    if user.role == "SYSTEM_ADMIN":
        return True
    if user.role == "FACULTY_ADMIN":
        return department.faculty_id == user.admin_faculty_id
    return department.id == user.admin_department_id


def can_administer_offering(user, offering):
    """Departments attached to the offering (primary or shared) may manage it."""
    if can_administer_department(user, offering.department):
        return True
    if not is_admin(user) or not getattr(offering, "pk", None):
        return False
    return any(can_administer_department(user, d) for d in offering.departments.all())


def is_offering_teacher(user, offering):
    """True for the lead lecturer or an optional co-lecturer of an offering."""
    if not user or not getattr(user, "is_authenticated", False) or offering is None:
        return False
    return user.id in {offering.lecturer_id, offering.co_lecturer_id}


def offering_teacher_filter(user, prefix=""):
    """Q object matching offerings taught by `user` as lead or co-lecturer."""
    return Q(**{f"{prefix}lecturer": user}) | Q(**{f"{prefix}co_lecturer": user})


def scope_by_department(queryset, user, path="department"):
    """Limit a queryset whose `path` resolves to a Department or its id."""
    if not is_admin(user):
        return queryset.none()
    if user.role == "SYSTEM_ADMIN":
        return queryset
    if path in {"id", "pk"}:
        if user.role == "FACULTY_ADMIN":
            return queryset.filter(faculty_id=user.admin_faculty_id)
        return queryset.filter(id=user.admin_department_id)
    if user.role == "FACULTY_ADMIN":
        return queryset.filter(**{f"{path}__faculty_id": user.admin_faculty_id})
    return queryset.filter(**{path: user.admin_department_id})


def scope_faculties(queryset, user):
    if not is_admin(user):
        return queryset.none()
    if user.role == "SYSTEM_ADMIN":
        return queryset
    faculty_id = user.admin_faculty_id if user.role == "FACULTY_ADMIN" else user.admin_department.faculty_id
    return queryset.filter(id=faculty_id)


def scope_users(queryset, user):
    if not is_admin(user):
        return queryset.none()
    if user.role == "SYSTEM_ADMIN":
        return queryset
    if user.role == "FACULTY_ADMIN":
        scope = (
            Q(student_profile__department__faculty_id=user.admin_faculty_id)
            | Q(lecturer_profile__department__faculty_id=user.admin_faculty_id)
            | Q(admin_faculty_id=user.admin_faculty_id)
            | Q(admin_department__faculty_id=user.admin_faculty_id)
        )
    else:
        scope = (
            Q(student_profile__department_id=user.admin_department_id)
            | Q(lecturer_profile__department_id=user.admin_department_id)
            | Q(admin_department_id=user.admin_department_id)
        )
    return queryset.filter(scope).distinct()


def can_view_user(admin, target):
    return is_admin(admin) and scope_users(type(target).objects.filter(pk=target.pk), admin).exists()


def can_manage_announcement(user, announcement):
    """An admin may manage only announcements addressed to their own unit."""
    if user.role in ADMIN_ROLES:
        if not is_admin(user):
            return False
        if user.role == "SYSTEM_ADMIN":
            return True
        if announcement.scope_type == "FACULTY":
            return can_administer_faculty(user, announcement.faculty)
        if announcement.scope_type == "DEPARTMENT":
            return can_administer_department(user, announcement.department)
        if announcement.scope_type == "COURSE" and announcement.course_offering_id:
            return can_administer_offering(user, announcement.course_offering)
        return False
    return announcement.created_by_id == user.id
