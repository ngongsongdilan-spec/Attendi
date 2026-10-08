import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedUUIDModel


class UploadedFile(TimeStampedUUIDModel):
    """File metadata stored in DB. Actual file in object storage or MEDIA_ROOT."""
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_files")
    original_name = models.CharField(max_length=500)
    storage_key = models.CharField(max_length=500)
    mime_type = models.CharField(max_length=100, blank=True, default="")
    size_bytes = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, default="ACTIVE")

    def __str__(self):
        return self.original_name


class LearningMaterial(TimeStampedUUIDModel):
    """Learning materials attached to a course offering (FR-050)."""
    class Visibility(models.TextChoices):
        COURSE = "COURSE", "Course Enrolled Students"
        PUBLIC = "PUBLIC", "Public"

    course_offering = models.ForeignKey(
        "academics.CourseOffering", on_delete=models.CASCADE, related_name="materials"
    )
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="materials")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    file = models.ForeignKey(UploadedFile, null=True, blank=True, on_delete=models.SET_NULL, related_name="materials")
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.COURSE)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Assignment(TimeStampedUUIDModel):
    """Course assignment with teacher-controlled submission policy (Google-Classroom style).

    max_submissions (0 = unlimited) caps how many times a student may turn in work.
    A returned submission is freed again so the student can resubmit.
    """
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ARCHIVED = "ARCHIVED", "Archived"

    course_offering = models.ForeignKey(
        "academics.CourseOffering", on_delete=models.CASCADE, related_name="assignments"
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_assignments")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    points_possible = models.PositiveIntegerField(default=0)
    due_at = models.DateTimeField(null=True, blank=True)
    allow_late = models.BooleanField(default=False)
    max_submissions = models.PositiveIntegerField(default=1)
    attachment = models.ForeignKey(
        UploadedFile, null=True, blank=True, on_delete=models.SET_NULL, related_name="assignment_briefs"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


STATUS_CHOICES = [("DRAFT", "Draft"), ("PUBLISHED", "Published")]


class AssessmentGroup(TimeStampedUUIDModel):
    """Several assessments combined into one reported grade (e.g. all CAs
    combined into a single Continuous Assessment out of 30).

    Each member keeps its own marking scale; its contribution is normalised
    against the group maximum so members on different scales combine fairly.
    """

    course_offering = models.ForeignKey(
        "academics.CourseOffering", on_delete=models.CASCADE, related_name="assessment_groups"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_assessment_groups"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    maximum_score = models.DecimalField(max_digits=7, decimal_places=2, default=30)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="DRAFT", db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.maximum_score})"


class Assessment(TimeStampedUUIDModel):
    """A graded assessment sheet for a course: a CA, an exam, or a mark sheet.

    A lecturer creates the sheet, enters marks for the enrolled cohort, then
    PUBLISHES it so students can see their marks, raise a dispute if something
    is wrong, and the lecturer exports a CSV for the bursar/external software.
    """

    class Category(models.TextChoices):
        CA = "CA", "Continuous Assessment"
        EXAM = "EXAM", "Exam"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    course_offering = models.ForeignKey(
        "academics.CourseOffering", on_delete=models.CASCADE, related_name="assessments"
    )
    group = models.ForeignKey(
        AssessmentGroup, null=True, blank=True, on_delete=models.SET_NULL, related_name="assessments"
    )
    group_weight = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Share of the group grade this assessment carries (percent). "
                  "Leave blank to split the group evenly between its members.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_assessments"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.CA)
    maximum_score = models.DecimalField(max_digits=7, decimal_places=2, default=100)
    raw_maximum = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True,
        help_text="Scale the lecturer actually marks on (e.g. 20 while the assessment is reported out of 30). "
                  "Empty means marks are entered directly on the reported scale.",
    )
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    attachment = models.ForeignKey(
        UploadedFile, null=True, blank=True, on_delete=models.SET_NULL, related_name="assessment_sheets"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.course_offering})"


class AssessmentMark(TimeStampedUUIDModel):
    """One student's mark on an assessment sheet, plus the dispute workflow."""

    class DisputeStatus(models.TextChoices):
        NONE = "NONE", "No dispute"
        OPEN = "OPEN", "Awaiting lecturer"
        RESOLVED = "RESOLVED", "Resolved"

    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="marks")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assessment_marks")
    score = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    comment = models.TextField(blank=True, default="")
    dispute_status = models.CharField(
        max_length=10, choices=DisputeStatus.choices, default=DisputeStatus.NONE, db_index=True
    )
    dispute_reason = models.TextField(blank=True, default="")
    dispute_response = models.TextField(blank=True, default="")
    disputed_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["student__last_name", "student__first_name"]
        constraints = [
            models.UniqueConstraint(fields=["assessment", "student"], name="unique_assessment_mark"),
        ]

    def __str__(self):
        return f"{self.student} -> {self.assessment.title}: {self.score}"


class AssignmentSubmission(TimeStampedUUIDModel):
    """A student's submitted work for an assignment (one row per attempt)."""

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        RETURNED = "RETURNED", "Returned"
        GRADED = "GRADED", "Graded"

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignment_submissions")
    file = models.ForeignKey(
        UploadedFile, null=True, blank=True, on_delete=models.SET_NULL, related_name="assignment_submissions"
    )
    note = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    is_late = models.BooleanField(default=False)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True, default="")
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="graded_submissions"
    )
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student} -> {self.assignment.title}"
