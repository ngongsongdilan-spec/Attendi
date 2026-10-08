import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedUUIDModel


class Announcement(TimeStampedUUIDModel):
    """Announcements with scope-based visibility (FR-060-062, BR-080-084).

    Scopes: FACULTY, DEPARTMENT, COURSE.
    Audience determined by scope + FK relationships.
    """
    class ScopeType(models.TextChoices):
        FACULTY = "FACULTY", "Faculty"
        DEPARTMENT = "DEPARTMENT", "Department"
        COURSE = "COURSE", "Course"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        ARCHIVED = "ARCHIVED", "Archived"

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="announcements")
    scope_type = models.CharField(max_length=20, choices=ScopeType.choices, db_index=True)
    faculty = models.ForeignKey("academics.Faculty", null=True, blank=True, on_delete=models.CASCADE, related_name="announcements")
    department = models.ForeignKey("academics.Department", null=True, blank=True, on_delete=models.CASCADE, related_name="announcements")
    course_offering = models.ForeignKey("academics.CourseOffering", null=True, blank=True, on_delete=models.CASCADE, related_name="announcements")
    title = models.CharField(max_length=300)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PUBLISHED, db_index=True)
    # Pinned announcements get the hero treatment in the UI. At most one
    # announcement per scope target may be pinned at a time.
    is_pinned = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-is_pinned", "-published_at", "-created_at"]

    def __str__(self):
        return f"[{self.scope_type}] {self.title}"

    def audience_queryset(self):
        """Every user who should receive this announcement.

        Drives both the recipient count and the read tally, so the two can never
        disagree with each other.
        """
        from apps.accounts.models import User

        users = User.objects.filter(is_active=True)

        if self.scope_type == self.ScopeType.FACULTY:
            if self.faculty_id:
                dept_ids = self.faculty.departments.values_list("id", flat=True)
                return users.filter(
                    models.Q(role__in=["LECTURER", "STUDENT"], lecturer_profile__department_id__in=dept_ids)
                    | models.Q(role="STUDENT", student_profile__department_id__in=dept_ids)
                )
            return users.exclude(role="STUDENT").filter(is_active=True)

        if self.scope_type == self.ScopeType.DEPARTMENT:
            if self.department_id:
                return users.filter(
                    models.Q(role="STUDENT", student_profile__department_id=self.department_id)
                    | models.Q(role="LECTURER", lecturer_profile__department_id=self.department_id)
                )
            return users.none()

        if self.scope_type == self.ScopeType.COURSE and self.course_offering_id:
            return users.filter(
                enrollments__course_offering_id=self.course_offering_id,
                enrollments__status="ACTIVE",
            )

        return users.none()


class AnnouncementRead(TimeStampedUUIDModel):
    """A student's acknowledgement of an announcement (FR-063).

    One row per student per announcement. Doubles as the participation record
    a department asks for when it wants evidence that a notice was seen.
    """

    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name="reads"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="announcement_reads"
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-read_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["announcement", "user"], name="unique_announcement_read"
            ),
        ]
        indexes = [models.Index(fields=["announcement", "read_at"])]

    def __str__(self):
        return f"{self.user_id} read {self.announcement_id}"
