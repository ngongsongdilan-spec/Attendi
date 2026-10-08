import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimeStampedUUIDModel


class Project(TimeStampedUUIDModel):
    """Academic project lifecycle: DRAFT -> ACTIVE -> COMPLETED -> ARCHIVED (BR-140-143)."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        ARCHIVED = "ARCHIVED", "Archived"

    class Scope(models.TextChoices):
        """How the work is divided (FR-075).

        INDIVIDUAL     each enrolled student runs their own copy of the project
        CLASS_WIDE     one project, split into groups that all work on it together
        GROUP_SPECIFIC an independent project owned by a single group
        """

        INDIVIDUAL = "INDIVIDUAL", "Individual"
        CLASS_WIDE = "CLASS_WIDE", "Class-wide (grouped)"
        GROUP_SPECIFIC = "GROUP_SPECIFIC", "Assigned to one group"

    course_offering = models.ForeignKey(
        "academics.CourseOffering", on_delete=models.CASCADE, related_name="projects"
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_projects")
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="supervised_projects"
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    objectives = models.TextField(blank=True, default="")
    deadline = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    scope = models.CharField(
        max_length=20, choices=Scope.choices, default=Scope.INDIVIDUAL, db_index=True
    )
    # Only set for GROUP_SPECIFIC: the one group this project belongs to.
    group = models.ForeignKey(
        "ProjectGroup", null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_projects"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def clean(self):
        if self.scope == self.Scope.GROUP_SPECIFIC and self.group_id is None:
            raise ValidationError({"group": "A group-assigned project must name a group."})
        if self.scope != self.Scope.GROUP_SPECIFIC and self.group_id is not None:
            raise ValidationError({"group": "Only a group-assigned project may name a group."})
        # The named group normally lives in the CLASS_WIDE project for the same
        # course; it just has to belong to the same offering, and it cannot be
        # one of this project's own groups.
        if self.group_id:
            group = self.group
            if group.project_id == self.id:
                raise ValidationError({"group": "A project cannot be assigned to its own group."})
            if self.course_offering_id and group.project.course_offering_id != self.course_offering_id:
                raise ValidationError({"group": "That group belongs to a different course."})


class ClassDelegate(TimeStampedUUIDModel):
    """The single class delegate for a course offering (FR-076).

    A delegate may form and manage groups inside a CLASS_WIDE project but
    cannot edit the project itself, assign grades, or appoint another delegate.
    """

    course_offering = models.OneToOneField(
        "academics.CourseOffering", on_delete=models.CASCADE, related_name="class_delegate"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="class_delegate_roles"
    )
    appointed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="appointed_delegates"
    )
    appointed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "class delegate"
        verbose_name_plural = "class delegates"

    def __str__(self):
        name = self.student.get_full_name() if self.student else "none"
        return f"{self.course_offering} delegate: {name}"


class ProjectGroup(TimeStampedUUIDModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="groups")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    # Convenience pointer; kept in sync with the member holding GROUP_LEADER.
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="led_project_groups"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.project.title} - {self.name}"


class ProjectMember(TimeStampedUUIDModel):
    """Student membership in a project (BR-101)."""

    class Role(models.TextChoices):
        MEMBER = "MEMBER", "Member"
        GROUP_LEADER = "GROUP_LEADER", "Group Leader"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    group = models.ForeignKey(ProjectGroup, null=True, blank=True, on_delete=models.SET_NULL, related_name="members")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "student"], name="unique_project_membership"),
        ]


class ProjectTask(TimeStampedUUIDModel):
    """Tasks within a project (FR-080, BR-110-113)."""

    class Status(models.TextChoices):
        TODO = "TODO", "To Do"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    group = models.ForeignKey(ProjectGroup, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks")
    assigned_student = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_tasks"
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_tasks")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO, db_index=True)
    due_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProjectMilestone(TimeStampedUUIDModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    due_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default="PENDING")

    class Meta:
        ordering = ["due_at"]


class ProjectContribution(TimeStampedUUIDModel):
    """Evidence of student participation in a project (FR-090, BR-120-122)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="contributions")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contributions")
    task = models.ForeignKey(ProjectTask, null=True, blank=True, on_delete=models.SET_NULL, related_name="contributions")
    description = models.TextField(blank=True, default="")
    contribution_type = models.CharField(max_length=30, default="TASK_COMPLETION")

    class Meta:
        ordering = ["-created_at"]


class AssessmentComponent(TimeStampedUUIDModel):
    """Assessment categories within a project (FR-100, BR-130)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="assessment_components")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    maximum_score = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1)

    class Meta:
        ordering = ["name"]


class AssessmentRecord(TimeStampedUUIDModel):
    """Individual student assessment for a component (FR-101)."""
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINALIZED = "FINALIZED", "Finalized"

    assessment_component = models.ForeignKey(AssessmentComponent, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assessment_records")
    assessor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assessed_records")
    score = models.DecimalField(max_digits=7, decimal_places=2)
    feedback = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.FINALIZED)
    assessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["assessment_component", "student"], name="unique_assessment"),
        ]


class ProjectDocument(TimeStampedUUIDModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_docs")
    file = models.ForeignKey("learning.UploadedFile", on_delete=models.CASCADE, related_name="project_documents")
    document_type = models.CharField(max_length=30, default="OTHER")

    class Meta:
        ordering = ["-created_at"]
