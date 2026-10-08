import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedUUIDModel


class AttendanceSession(TimeStampedUUIDModel):
    """An attendance window opened by a lecturer (BR-030).

    Contains references to the class session it's tied to.
    """
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CLOSED = "CLOSED", "Closed"

    class SessionMode(models.TextChoices):
        PROJECTOR = "PROJECTOR", "Projector (single QR)"
        STATIONS = "STATIONS", "Student stations (multiple QR)"

    class_session = models.ForeignKey(
        "academics.ClassSession", on_delete=models.CASCADE, related_name="attendance_sessions"
    )
    lecturer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_sessions")
    started_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    mode = models.CharField(max_length=20, choices=SessionMode.choices, default=SessionMode.STATIONS)
    expected_headcount = models.PositiveIntegerField(null=True, blank=True, default=None,
        help_text="Optional: auto-closes session once this many unique students have checked in.")
    headcount_reached_at = models.DateTimeField(null=True, blank=True, default=None)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"AttendanceSession({self.class_session} - {self.status})"

    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE and self.expires_at > timezone.now()

    @property
    def course_offering(self):
        return self.class_session.class_definition.course_offering


class AttendanceCheckpoint(TimeStampedUUIDModel):
    """Students physically in the classroom selected as QR code anchors (BR-050-053).

    Temporary role for the session only (BR-053). Stations can be picked by
    the teacher or auto-selected by the system from the most consistent
    attendees (FR-047).
    """
    class SelectionMethod(models.TextChoices):
        TEACHER = "TEACHER", "Selected by teacher"
        AUTO = "AUTO", "Auto-selected by system"

    attendance_session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="checkpoints")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checkpoint_assignments")
    checkpoint_number = models.PositiveIntegerField()
    selection_method = models.CharField(max_length=10, choices=SelectionMethod.choices, default=SelectionMethod.TEACHER)

    class Meta:
        ordering = ["checkpoint_number"]
        constraints = [
            models.UniqueConstraint(fields=["attendance_session", "student"], name="unique_checkpoint_student"),
        ]

    def __str__(self):
        return f"Checkpoint {self.checkpoint_number} - {self.student.email}"


class AttendanceRecord(TimeStampedUUIDModel):
    """Permanent attendance record in PostgreSQL (BR-040).

    Database constraint prevents duplicate attendance per session (FR-046).
    """
    class VerificationMethod(models.TextChoices):
        QR_SCAN = "QR_SCAN", "QR Code Scan"
        QR_STATION = "QR_STATION", "Confirmed via own station"
        MANUAL = "MANUAL", "Manually added by lecturer"

    attendance_session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_records")
    checkpoint = models.ForeignKey(
        AttendanceCheckpoint, null=True, blank=True, on_delete=models.SET_NULL, related_name="records"
    )
    recorded_at = models.DateTimeField(default=timezone.now)
    verification_method = models.CharField(max_length=20, choices=VerificationMethod.choices, default=VerificationMethod.QR_SCAN)
    status = models.CharField(max_length=20, default="PRESENT")

    class Meta:
        ordering = ["-recorded_at"]
        constraints = [
            models.UniqueConstraint(fields=["attendance_session", "student"], name="unique_attendance_record"),
        ]

    def __str__(self):
        return f"AttendanceRecord({self.student.email} - {self.attendance_session})"


class PointsLedger(TimeStampedUUIDModel):
    """Attendance points per student per session (FR-048).

    Categories and default points (settings-overridable):
      AUTO_STATION      10 - system-selected station (top attendee) that was used
      SCAN               9 - scanned a QR (almost the same as auto-station)
      TEACHER_STATION    5 - teacher-picked station (half of auto)
      MANUAL             0 - added manually after the session (discouraged)
    """
    class Category(models.TextChoices):
        AUTO_STATION = "AUTO_STATION", "Auto-selected station"
        TEACHER_STATION = "TEACHER_STATION", "Teacher-selected station"
        STATION_SCAN = "STATION_SCAN", "Scan at a student station"
        SCAN = "SCAN", "QR scan"
        MANUAL = "MANUAL", "Manual entry"
        STUDENT_OF_CLASS = "STUDENT_OF_CLASS", "Student of the class"

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="points_entries")
    attendance_session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="points_entries")
    category = models.CharField(max_length=20, choices=Category.choices)
    points = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["student", "attendance_session"], name="unique_points_per_session"),
        ]

    def __str__(self):
        return f"Points({self.student.email}, {self.category}, {self.points})"
