import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedUUIDModel


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.SYSTEM_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedUUIDModel):
    """Platform user. One unique account per academic identity (BR-001)."""

    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        LECTURER = "LECTURER", "Lecturer"
        DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN", "Department Administrator"
        FACULTY_ADMIN = "FACULTY_ADMIN", "Faculty Administrator"
        SYSTEM_ADMIN = "SYSTEM_ADMIN", "System Administrator"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        ARCHIVED = "ARCHIVED", "Archived"

    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    date_of_birth = models.DateField(null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_lecturer(self):
        return self.role == self.Role.LECTURER

    @property
    def is_admin_role(self):
        return self.role in {self.Role.DEPARTMENT_ADMIN, self.Role.FACULTY_ADMIN, self.Role.SYSTEM_ADMIN}

    def record_login(self):
        self.last_login_at = timezone.now()
        self.save(update_fields=["last_login_at", "updated_at"])


class StudentProfile(TimeStampedUUIDModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    student_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    department = models.ForeignKey(
        "academics.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="students"
    )
    admission_year = models.PositiveIntegerField(null=True, blank=True)
    level = models.CharField(max_length=20, blank=True, default="")
    personal_email = models.EmailField(null=True, blank=True)
    profile_bio = models.TextField(blank=True, default="")
    profile_image_reference = models.CharField(max_length=500, blank=True, default="")
    skills = models.JSONField(default=list, blank=True)
    achievements = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"StudentProfile({self.user.email})"


class LecturerProfile(TimeStampedUUIDModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="lecturer_profile")
    staff_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    department = models.ForeignKey(
        "academics.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="lecturers"
    )
    title = models.CharField(max_length=50, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    profile_image_reference = models.CharField(max_length=500, blank=True, default="")

    def __str__(self):
        return f"LecturerProfile({self.user.email})"
