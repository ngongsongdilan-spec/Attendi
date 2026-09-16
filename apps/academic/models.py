import uuid

from django.db import models


class Faculty(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "academic_faculty"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name="departments",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "academic_department"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Course(models.Model):
    """Minimal course aggregate used for enrollment-derived eligibility."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="courses",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "academic_course"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class ClassSession(models.Model):
    """A taught occurrence of a course; attendance sessions attach here."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="class_sessions")
    lecturer = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="class_sessions"
    )
    starts_at = models.DateTimeField()

    class Meta:
        db_table = "academic_class_session"
        ordering = ["-starts_at"]


class Enrollment(models.Model):
    """Course enrollment is the sole source of attendance eligibility."""

    student = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="enrollments")
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, default="active")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "academic_enrollment"
        constraints = [
            models.UniqueConstraint(fields=["student", "course"], name="unique_course_enrollment"),
        ]
