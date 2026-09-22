from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academic.models import ClassSession, Course, Enrollment
from apps.accounts.models import User
from apps.attendance.models import AttendanceRecord, AttendanceSession
from apps.attendance.services.attendance_service import (
    AlreadyMarkedError,
    SessionExpiredError,
    TokenStudentMismatchError,
    generate_checkpoint_token,
    scan_attendance,
    select_checkpoints,
)
from apps.attendance.utils.qr_tokens import TokenAlreadyUsedError, generate_token
from core.models import AuditEvent


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "attendance-tests",
        }
    }
)
class AttendanceSecurityTests(TestCase):
    def setUp(self):
        self.lecturer = User.objects.create_user(
            "lecturer@example.test", "lecturer", "Lect", "Urer", "StrongPass!2026", role=User.Role.LECTURER
        )
        self.student = User.objects.create_user(
            "student@example.test", "student", "Stu", "Dent", "StrongPass!2026"
        )
        self.other_student = User.objects.create_user(
            "other@example.test", "other", "Other", "Student", "StrongPass!2026"
        )
        self.course = Course.objects.create(code="FET101", name="Secure Attendance")
        Enrollment.objects.create(student=self.student, course=self.course)
        Enrollment.objects.create(student=self.other_student, course=self.course)
        self.class_session = ClassSession.objects.create(
            course=self.course, lecturer=self.lecturer, starts_at=timezone.now()
        )
        self.session = AttendanceSession.objects.create(
            class_session=self.class_session,
            lecturer=self.lecturer,
            expires_at=timezone.now() + timedelta(seconds=60),
        )

    def checkpoint_token(self, student=None):
        checkpoint = select_checkpoints(
            lecturer=self.lecturer, session=self.session, student_ids=[(student or self.student).id]
        )[0]
        return generate_checkpoint_token(lecturer=self.lecturer, checkpoint=checkpoint), checkpoint

    def test_valid_authenticated_student_is_marked_once(self):
        token, checkpoint = self.checkpoint_token()
        record = scan_attendance(authenticated_student=self.student, token=token)
        self.assertEqual(record.student_id, self.student.id)
        self.assertEqual(record.checkpoint_id, checkpoint.id)

    def test_same_token_cannot_be_replayed(self):
        token, _ = self.checkpoint_token()
        scan_attendance(authenticated_student=self.student, token=token)
        with self.assertRaises(TokenAlreadyUsedError):
            scan_attendance(authenticated_student=self.student, token=token)

    def test_screenshot_token_cannot_credit_another_student(self):
        token, _ = self.checkpoint_token(student=self.student)
        with self.assertRaises(TokenStudentMismatchError):
            scan_attendance(authenticated_student=self.other_student, token=token)
        self.assertFalse(AttendanceRecord.objects.filter(student=self.other_student).exists())

    def test_cross_session_token_is_rejected(self):
        token, checkpoint = self.checkpoint_token()
        token = generate_token(checkpoint_id=checkpoint.id, session_id="different-session")
        with self.assertRaises(SessionExpiredError):
            scan_attendance(authenticated_student=self.student, token=token)

    def test_database_constraint_blocks_duplicate_student_record(self):
        token, checkpoint = self.checkpoint_token()
        scan_attendance(authenticated_student=self.student, token=token)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AttendanceRecord.objects.create(
                    attendance_session=self.session, student=self.student, checkpoint=checkpoint
                )

    def test_api_rejects_client_supplied_student_identity(self):
        token, _ = self.checkpoint_token()
        client = APIClient()
        client.force_authenticate(user=self.student)
        response = client.post(
            reverse("attendance:scan"), {"token": token, "student_id": str(self.other_student.id)}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(AttendanceRecord.objects.exists())

    def test_successful_scan_creates_a_durable_audit_event(self):
        token, _ = self.checkpoint_token()
        record = scan_attendance(authenticated_student=self.student, token=token)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="attendance_recorded", resource_type="attendance_record", resource_id=str(record.id)
            ).exists()
        )
