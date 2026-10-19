"""Shared academic provisioning helpers.

Kept out of the views so that opening a classroom and assigning a lecturer to an
offering prime the offering the same way: the same cohort, the same enrollment
semantics.
"""
from apps.accounts.models import User

from .models import Enrollment


def cohort_queryset(course):
    """Students who belong in an offering of `course`.

    Matches the classroom-creation rule: active students in the course's own
    department, narrowed to the course level when the course declares one.
    """
    qs = User.objects.filter(
        role=User.Role.STUDENT,
        is_active=True,
        student_profile__department=course.department,
    )
    if course.level:
        qs = qs.filter(student_profile__level=course.level)
    return qs


def enroll_cohort(offering):
    """Idempotently enroll the offering's cohort.

    Returns the number of *new* enrollments created; students already enrolled
    are left untouched.
    """
    created = 0
    for student in cohort_queryset(offering.course):
        _enrollment, was_created = Enrollment.objects.get_or_create(
            student=student,
            course_offering=offering,
            defaults={"status": Enrollment.Status.ACTIVE},
        )
        if was_created:
            created += 1
    return created
