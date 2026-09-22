"""Security-critical attendance workflows (BR-030 through BR-064)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable, List, Optional

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.academic.models import ClassSession, Enrollment
from apps.academic.services.eligibility_service import is_student_eligible_for_class
from apps.accounts.models import User
from apps.attendance.models import (
    AttendanceCheckpoint,
    AttendanceCorrection,
    AttendanceRecord,
    AttendanceSession,
)
from apps.attendance.utils.qr_tokens import (
    InvalidTokenError,
    TokenAlreadyUsedError,
    TokenExpiredError,
    consume_token,
    generate_token,
)
from core.audit import write_audit_entry


class AttendanceError(ValueError):
    """Base error for every rejected attendance operation."""


class SessionExpiredError(AttendanceError):
    """Session is inactive, closed, expired, or belongs to another token."""


class NotEligibleError(AttendanceError):
    """Authenticated student is not enrolled in the session's course."""


class AlreadyMarkedError(AttendanceError):
    """The student already has an attendance record in this session."""


class TokenStudentMismatchError(AttendanceError):
    """A checkpoint QR cannot be used to credit a different student."""


class LecturerNotAuthorizedError(AttendanceError):
    """Lecturer is not allowed to select checkpoints or correct attendance."""


class CheckpointNotEligibleError(AttendanceError):
    """A selected checkpoint student is not eligible for this class."""


class CorrectionAuthorizationError(AttendanceError):
    """An attendance correction lacks lecturer authority or an audit reason."""


def _session_is_active(session: AttendanceSession, now: Optional[datetime] = None) -> bool:
    now = now or timezone.now()
    return session.status == AttendanceSession.Status.ACTIVE and session.expires_at > now


def _ensure_active_matching_session(session: AttendanceSession, token_session_id: str) -> None:
    if str(session.id) != str(token_session_id) or not _session_is_active(session):
        raise SessionExpiredError("Attendance session is inactive, expired, or does not match this token")


def select_checkpoints(*, lecturer: User, session: AttendanceSession, student_ids: Iterable[Any]) -> List[AttendanceCheckpoint]:
    """Create session-scoped checkpoints after server-side eligibility checks."""
    if lecturer is None or session is None or str(lecturer.id) != str(session.lecturer_id):
        raise LecturerNotAuthorizedError("Only the session lecturer can select checkpoints")
    if not _session_is_active(session):
        raise SessionExpiredError("Cannot select checkpoints for an inactive session")

    selected = list(dict.fromkeys(student_ids or []))
    if not selected:
        raise CheckpointNotEligibleError("At least one eligible checkpoint student is required")

    checkpoints: List[AttendanceCheckpoint] = []
    for student_id in selected:
        eligible = is_student_eligible_for_class(
            student_id,
            class_id=session.class_session_id,
            ClassModel=ClassSession,
            EnrollmentModel=Enrollment,
        )
        if not eligible:
            raise CheckpointNotEligibleError("Checkpoint student is not eligible for this class")
        checkpoint, _ = AttendanceCheckpoint.objects.get_or_create(
            attendance_session=session, student_id=student_id
        )
        checkpoints.append(checkpoint)
    return checkpoints


def generate_checkpoint_token(*, lecturer: User, checkpoint: AttendanceCheckpoint) -> str:
    """Issue a ten-second token only for a valid, session-scoped checkpoint."""
    session = checkpoint.attendance_session
    if str(lecturer.id) != str(session.lecturer_id):
        raise LecturerNotAuthorizedError("Only the session lecturer can issue checkpoint tokens")
    if not _session_is_active(session):
        raise SessionExpiredError("Cannot issue a token for an inactive session")
    return generate_token(checkpoint_id=checkpoint.id, session_id=session.id)


def scan_attendance(*, authenticated_student: User, token: str) -> AttendanceRecord:
    """Consume one QR token and create exactly one authenticated attendance record.

    The ordered checks mirror BR-033/038/036/037/031/040.  Token consumption
    is atomic in the cache and database uniqueness is the final race defense.
    """
    if authenticated_student is None or not authenticated_student.is_authenticated:
        raise NotEligibleError("An authenticated student account is required")
    if authenticated_student.role != User.Role.STUDENT:
        raise NotEligibleError("Only student accounts can scan attendance")

    # 1–2. Missing/expired and replayed tokens are named token exceptions.
    payload = consume_token(token)

    with transaction.atomic():
        checkpoint = AttendanceCheckpoint.objects.select_related("attendance_session").filter(
            id=payload.get("checkpoint_id")
        ).first()
        if checkpoint is None:
            raise InvalidTokenError("Attendance checkpoint does not exist")

        # Lock the session so concurrent close/expiry operations cannot interleave
        # between validation and record insertion on PostgreSQL.
        session = AttendanceSession.objects.select_for_update().filter(id=checkpoint.attendance_session_id).first()
        if session is None:
            raise SessionExpiredError("Attendance session no longer exists")
        _ensure_active_matching_session(session, payload.get("session_id", ""))
        if str(checkpoint.attendance_session_id) != str(session.id):
            raise SessionExpiredError("Checkpoint belongs to a different attendance session")

        # This binding defeats screenshot sharing: a checkpoint token only credits
        # the exact student selected for that checkpoint, never an arbitrary peer.
        if str(checkpoint.student_id) != str(authenticated_student.id):
            raise TokenStudentMismatchError("QR token was issued for another student")

        eligible = is_student_eligible_for_class(
            authenticated_student.id,
            class_id=session.class_session_id,
            ClassModel=ClassSession,
            EnrollmentModel=Enrollment,
        )
        if not eligible:
            raise NotEligibleError("Student is not eligible for this class")

        if AttendanceRecord.objects.filter(
            attendance_session=session, student=authenticated_student
        ).exists():
            raise AlreadyMarkedError("Student is already marked for this session")

        try:
            record = AttendanceRecord.objects.create(
                attendance_session=session,
                student=authenticated_student,
                checkpoint=checkpoint,
            )
        except IntegrityError as exc:
            # BR-040 final race defense: UNIQUE(session, student) remains
            # authoritative if two transactions passed the fast-fail query.
            raise AlreadyMarkedError("Student is already marked for this session") from exc

        write_audit_entry(
            action="attendance_recorded",
            resource_type="attendance_record",
            resource_id=record.id,
            actor_id=authenticated_student.id,
            details={"session_id": str(session.id), "checkpoint_id": str(checkpoint.id)},
        )
    return record


def correct_attendance(*, record: AttendanceRecord, lecturer: User, reason: str) -> AttendanceCorrection:
    """Append a correction event; never silently overwrite original attendance."""
    if not reason or not reason.strip():
        raise CorrectionAuthorizationError("A correction reason is required")
    if str(record.attendance_session.lecturer_id) != str(lecturer.id):
        raise CorrectionAuthorizationError("Only the session lecturer can correct attendance")
    with transaction.atomic():
        correction = AttendanceCorrection.objects.create(
            attendance_record=record, corrected_by=lecturer, reason=reason.strip()
        )
        write_audit_entry(
            action="attendance_corrected",
            resource_type="attendance_record",
            resource_id=record.id,
            actor_id=lecturer.id,
            details={"correction_id": correction.id, "reason": correction.reason},
        )
    return correction


def flag_suspicious_activity(*, actor_id: Any, reason: str, metadata: Optional[dict[str, Any]] = None) -> None:
    """Flag for review only; callers must never use this to block a valid scan."""
    write_audit_entry(
        action="attendance_suspicious_activity",
        resource_type="attendance_security_event",
        resource_id=f"{actor_id}:{timezone.now().isoformat()}",
        actor_id=actor_id,
        details={"reason": reason, **(metadata or {})},
    )


SUSPICIOUS_FAILURE_THRESHOLD = 3
SUSPICIOUS_FAILURE_WINDOW_SECONDS = 60


def evaluate_repeated_failure(
    *,
    cache_backend: Any,
    actor_id: Any,
    failure_code: str,
    request_ip: Optional[str] = None,
) -> bool:
    """BR-064: track repeated scan failures and flag suspicious patterns.

    Returns True if a suspicious activity flag was raised.
    This function decides when to flag — callers only supply the cache
    backend and identifiers; the threshold is owned by this service.
    """
    key = f"attendance:scan-failures:{actor_id}:{failure_code}"
    cache_backend.add(key, 0, timeout=SUSPICIOUS_FAILURE_WINDOW_SECONDS)
    try:
        failures = cache_backend.incr(key)
    except ValueError:
        failures = 1

    if failures >= SUSPICIOUS_FAILURE_THRESHOLD:
        metadata: dict[str, Any] = {"failure_code": failure_code}
        if request_ip:
            metadata["request_ip"] = request_ip
        flag_suspicious_activity(
            actor_id=actor_id,
            reason="repeated_invalid_attendance_scan",
            metadata=metadata,
        )
        return True
    return False
