import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedUUIDModel


class Notification(TimeStampedUUIDModel):
    """In-app notifications for important events (FR-07 doc, API Spec §45)."""

    class NotificationType(models.TextChoices):
        ANNOUNCEMENT = "ANNOUNCEMENT", "Announcement"
        TASK_ASSIGNED = "TASK_ASSIGNED", "Task Assigned"
        TASK_COMPLETED = "TASK_COMPLETED", "Task Completed"
        PROJECT_UPDATE = "PROJECT_UPDATE", "Project Update"
        ATTENDANCE = "ATTENDANCE", "Attendance"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=30, choices=NotificationType.choices, db_index=True)
    title = models.CharField(max_length=300)
    message = models.TextField(blank=True, default="")
    reference_type = models.CharField(max_length=30, blank=True, default="")
    reference_id = models.UUIDField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type}: {self.title}"
