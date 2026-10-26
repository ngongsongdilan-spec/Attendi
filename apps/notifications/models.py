from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedUUIDModel


class PlatformUpdate(TimeStampedUUIDModel):
    """A published release note. Delivery is lazy: each user gets one
    Notification the next time they read their inbox, so publishing does not
    require fanning out rows to every account."""

    version = models.CharField(max_length=40, unique=True)
    title = models.CharField(max_length=300)
    message = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    published_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return f"{self.version}: {self.title}"


class Notification(TimeStampedUUIDModel):
    """In-app notifications for important events (FR-07 doc, API Spec §45)."""

    class NotificationType(models.TextChoices):
        ANNOUNCEMENT = "ANNOUNCEMENT", "Announcement"
        TASK_ASSIGNED = "TASK_ASSIGNED", "Task Assigned"
        TASK_COMPLETED = "TASK_COMPLETED", "Task Completed"
        PROJECT_UPDATE = "PROJECT_UPDATE", "Project Update"
        ATTENDANCE = "ATTENDANCE", "Attendance"
        PLATFORM_UPDATE = "PLATFORM_UPDATE", "Platform Update"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=30, choices=NotificationType.choices, db_index=True)
    title = models.CharField(max_length=300)
    message = models.TextField(blank=True, default="")
    reference_type = models.CharField(max_length=30, blank=True, default="")
    reference_id = models.UUIDField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "reference_type", "reference_id"],
                condition=models.Q(type="PLATFORM_UPDATE"),
                name="unique_user_platform_update_notification",
            )
        ]

    def __str__(self):
        return f"{self.type}: {self.title}"
