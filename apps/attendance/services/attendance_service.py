"""Attendance service for active session validation and student check-in.

This module is intentionally framework-agnostic and does not build HTTP
responses or import DRF request objects. It raises domain errors when the
business rules are violated, leaving the API layer to map those exceptions to
standard error payloads.

Relevant rules implemented here:
- BR-030 Active attendance sessions only
- BR-031 Only eligible students may attend
- BR-032 Student must be authenticated
- BR-033 Valid temporary QR token required
- BR-037 Token must match the active session
- BR-038 Expired token cannot be reused
- BR-039 Student must submit their own attendance only
- BR-040 One attendance record per student per session
- BR-041 No submissions after session expiry
- BR-042 Corrections must remain auditable
- BR-050 Checkpoint students must be eligible
- BR-051 Checkpoint student must be physically present (checked by lecturer)
- BR-063 Attendance tied to authenticated account
- BR-064 Suspicious activity is reviewable, not automatic misconduct
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Protocol, Sequence

from core.common import ConfigurationError, get_attr, utc_now


class AttendanceError(ValueError):
    """Base domain error for attendance operations."""


class SessionNotActiveError(AttendanceError):
    """Raised when the attendance session is not currently active."""


class StudentNotAuthenticatedError(AttendanceError):
    """Raised when attendance is submitted without a valid authenticated student."""


class StudentNotEligibleError(AttendanceError):
    """Raised when a student is not eligible for the attendance session."""


class InvalidAttendanceTokenError(AttendanceError):
    """Raised when a QR token is invalid, expired, or mismatched."""


class DuplicateAttendanceError(AttendanceError):
    """Raised when the student already has an attendance record for the session."""


class AttendanceSessionExpiredError(AttendanceError):
    """Raised when a session is expired and no new submissions are allowed."""


class AttendanceCorrectionError(AttendanceError):
    """Raised when an attendance correction is attempted without a valid audit trail."""


class LecturerNotAuthorizedError(AttendanceError):
    """Raised when a lecturer lacks permission for an attendance operation."""


class AttendanceSessionLike(Protocol):
    id: Any
    is_active: Any
    expires_at: Any
    course_id: Any
    class_id: Any
    checkpoint_ids: Any
    started_at: Any
    status: Any
    started_by_id: Any
    closed_at: Any

    def save(self) -> Any:
        ...


class AttendanceRecordLike(Protocol):
    id: Any
    session_id: Any
    student_id: Any
    status: Any
    scanned_at: Any
    corrected_at: Any
    correction_note: Any
    is_corrected: Any
    source_token: Any

    def save(self) -> Any:
        ...


class StudentLike(Protocol):
    id: Any
    is_authenticated: Any
    is_active: Any


class CheckpointLike(Protocol):
    id: Any
    student_id: Any
    session_id: Any
    is_confirmed: Any


def select_checkpoints(
    *,
    lecturer_id: Any,
    session: Any,
    checkpoint_student_ids: Iterable[Any],
    eligibility_checker: Any,
    lecturer_authorizer: Optional[Any] = None,
) -> List[Any]:
    """Validate the temporary checkpoint selection for an active session."""
    # BR-050: every selected checkpoint student must be eligible for the
    # session's class/course.
    if lecturer_id is None:
        raise LecturerNotAuthorizedError("Lecturer identity is required")
    _validate_session_active(session)
    if lecturer_authorizer is not None and not bool(
        lecturer_authorizer(lecturer_id=lecturer_id, session=session)
    ):
        raise LecturerNotAuthorizedError(
            "Lecturer is not authorized to manage this attendance session"
        )
    elif lecturer_authorizer is None:
        raise LecturerNotAuthorizedError(
            "A lecturer authorization check is required for checkpoint selection"
        )

    selected_ids = list(dict.fromkeys(checkpoint_student_ids or []))
    if not selected_ids:
        raise AttendanceError("At least one checkpoint student is required")

    for student_id in selected_ids:
        _validate_student_eligibility(
            student_id,
            session,
            eligibility_checker=eligibility_checker,
        )

    # BR-051: the lecturer's selection is the backend representation of their
    # physical-presence confirmation; the service cannot verify physical presence.
    # BR-052: no spatial distribution rule is hard-coded without spatial data.
    # BR-053: this function returns IDs for this session only and changes no role.
    return selected_ids


def _session_is_active(session: Any) -> bool:
    if session is None:
        return False

    active_flag = get_attr(session, "is_active", "active")
    if active_flag is not None:
        return bool(active_flag)

    status = get_attr(session, "status", "state")
    if status is not None:
        status_text = str(status).lower()
        if status_text in {"active", "open", "in_progress", "running"}:
            return True
        if status_text in {"closed", "expired", "completed", "cancelled"}:
            return False

    expires_at = get_attr(session, "expires_at", "ends_at", "session_expires_at")
    if expires_at is not None:
        try:
            return utc_now() < expires_at
        except TypeError:
            return False

    return False


def _attendance_exists_for_session(
    session_id: Any,
    student_id: Any,
    *,
    AttendanceRecordModel: type[AttendanceRecordLike],
) -> bool:
    """Return whether a student already has one attendance record for the session."""
    try:
        queryset = AttendanceRecordModel.objects.filter(session_id=session_id, student_id=student_id)
        return queryset.exists()
    except AttributeError:
        records = list(AttendanceRecordModel.objects.filter(session_id=session_id, student_id=student_id))
        return bool(records)


def _validate_authenticated_student(student: Optional[StudentLike]) -> None:
    # BR-032, BR-063: attendance must always be associated with an authenticated
    # account, not just a QR or raw student id.
    if student is None:
        raise StudentNotAuthenticatedError("Student must be authenticated to record attendance")

    is_authenticated = get_attr(student, "is_authenticated", "authenticated")
    if is_authenticated is not True:
        raise StudentNotAuthenticatedError("Student must be authenticated to record attendance")

    is_active = get_attr(student, "is_active", "active")
    if is_active is not True:
        raise StudentNotAuthenticatedError("Student account is not active")


def _validate_student_eligibility(
    student_id: Any,
    session: Any,
    *,
    eligibility_checker: Any,
) -> None:
    # BR-031, BR-050: only eligible students may attend or serve as checkpoint
    # students for an active session.
    if eligibility_checker is None:
        raise StudentNotEligibleError("Eligibility checker is required")

    try:
        eligible = eligibility_checker(student_id=student_id, session=session)
    except TypeError:
        eligible = eligibility_checker(student_id, session)

    if not bool(eligible):
        raise StudentNotEligibleError("Student is not eligible for this session")


def _validate_session_active(session: Any) -> None:
    # BR-030, BR-036, BR-041: sessions must be active and not yet expired.
    if session is None:
        raise SessionNotActiveError("Attendance session was not found")

    if not _session_is_active(session):
        raise AttendanceSessionExpiredError("Attendance session has expired or is no longer active")


def _validate_token(
    token: Optional[str],
    *,
    session: Any,
    student_id: Any,
    token_validator: Any,
) -> Dict[str, Any]:
    # BR-033, BR-034, BR-037, BR-038, BR-062: tokens must be valid, temporary,
    # session-bound, and expired tokens are rejected.
    if token_validator is None:
        raise InvalidAttendanceTokenError("QR token validator is required")

    if token is None or not str(token).strip():
        raise InvalidAttendanceTokenError("Attendance token is required")

    try:
        payload = token_validator(
            token,
            expected_session_id=getattr(session, "id", None),
            expected_student_id=student_id,
        )
    except TypeError:
        payload = token_validator(token, session.id, student_id)

    if not isinstance(payload, dict):
        raise InvalidAttendanceTokenError("Attendance token payload is invalid")
    return payload


def _assert_self_marking(student_id: Any, token_payload: Dict[str, Any]) -> None:
    # BR-039, BR-063: the token may not authorize a student to mark another
    # authenticated student as present.
    token_student_id = token_payload.get("student_id")
    if token_student_id is not None and str(token_student_id) != str(student_id):
        raise InvalidAttendanceTokenError("Token is for a different student and cannot be used here")


def _assert_unique_attendance(
    session_id: Any,
    student_id: Any,
    *,
    AttendanceRecordModel: type[AttendanceRecordLike],
) -> None:
    # BR-040: one attendance record per student per session, enforced in the data
    # layer as a unique constraint and checked here before creation.
    if _attendance_exists_for_session(session_id, student_id, AttendanceRecordModel=AttendanceRecordModel):
        raise DuplicateAttendanceError("Student already has an attendance record for this session")


def _build_audit_note(action: str, *, session_id: Any, student_id: Any, actor_id: Any, reason: Optional[str] = None) -> str:
    note = f"{action}: session={session_id}, student={student_id}, actor={actor_id}"
    if reason:
        note = f"{note}; reason={reason}"
    return note


def submit_attendance(
    *,
    student: Optional[StudentLike],
    session: Any,
    token: Optional[str],
    student_id: Any,
    session_id: Any,
    token_validator: Any,
    eligibility_checker: Any,
    AttendanceRecordModel: type[AttendanceRecordLike],
    audit_logger: Optional[Any] = None,
    actor_id: Optional[Any] = None,
) -> AttendanceRecordLike:
    """Submit a student attendance record for an active attendance session.

    The function is intentionally framework-agnostic: it validates the session,
    the authenticated student, the session-bound QR token, and the eligibility
    state before writing a single attendance record.
    """
    _validate_authenticated_student(student)
    authenticated_id = get_attr(student, "id", "student_id")
    if authenticated_id is None or str(authenticated_id) != str(student_id):
        raise StudentNotAuthenticatedError(
            "Attendance must be submitted for the authenticated student"
        )
    if session_id is None or str(session_id) != str(getattr(session, "id", None)):
        raise AttendanceError("Attendance session id does not match the active session")
    _validate_session_active(session)
    _validate_student_eligibility(student_id, session, eligibility_checker=eligibility_checker)
    payload = _validate_token(token, session=session, student_id=student_id, token_validator=token_validator)
    _assert_self_marking(student_id, payload)
    _assert_unique_attendance(session_id, student_id, AttendanceRecordModel=AttendanceRecordModel)

    record = AttendanceRecordModel()
    if hasattr(record, "session_id"):
        record.session_id = session_id
    if hasattr(record, "student_id"):
        record.student_id = student_id
    if hasattr(record, "status"):
        record.status = "present"
    if hasattr(record, "scanned_at"):
        record.scanned_at = utc_now()
    if hasattr(record, "source_token"):
        record.source_token = token

    record.save()

    if audit_logger is not None:
        audit_logger(
            action="attendance_submitted",
            session_id=session_id,
            student_id=student_id,
            actor_id=actor_id or student_id,
            note=_build_audit_note(
                "attendance_submitted",
                session_id=session_id,
                student_id=student_id,
                actor_id=actor_id or student_id,
            ),
        )

    return record


def create_checkpoint_token(
    *,
    lecturer_id: Any,
    student: Optional[StudentLike],
    session: Any,
    checkpoint_student_id: Any,
    token_generator: Any,
    eligibility_checker: Any,
    checkpoint_model: Optional[type[CheckpointLike]] = None,
    conference_note: Optional[str] = None,
    lecturer_authorizer: Optional[Any] = None,
) -> str:
    """Generate a QR token for a checkpoint student after confirmation.

    The lecturer is responsible for confirming the checkpoint student is present
    in the classroom; the backend enforces the eligibility of the selected
    student, not whether the lecturer made the physical verification.
    """
    # BR-050, BR-051, BR-063: only eligible students are selected and the token is
    # tied to the authenticated lecturer's attendance session.
    if lecturer_id is None:
        raise StudentNotAuthenticatedError("Lecturer identity is required")
    if lecturer_authorizer is None:
        raise StudentNotAuthenticatedError(
            "A lecturer authorization check is required for checkpoint tokens"
        )
    if not bool(lecturer_authorizer(lecturer_id=lecturer_id, session=session)):
        raise StudentNotAuthenticatedError(
            "Lecturer is not authorized to manage this attendance session"
        )

    _validate_authenticated_student(student)
    _validate_session_active(session)
    _validate_student_eligibility(checkpoint_student_id, session, eligibility_checker=eligibility_checker)

    if checkpoint_model is not None:
        checkpoint = checkpoint_model()
        if hasattr(checkpoint, "session_id"):
            checkpoint.session_id = getattr(session, "id", None)
        if hasattr(checkpoint, "student_id"):
            checkpoint.student_id = checkpoint_student_id
        if hasattr(checkpoint, "is_confirmed"):
            checkpoint.is_confirmed = True
        if conference_note is not None and hasattr(checkpoint, "note"):
            checkpoint.note = conference_note
        checkpoint.save()

    if token_generator is None:
        raise InvalidAttendanceTokenError("Token generator is required")

    return token_generator(session_id=getattr(session, "id", None), student_id=checkpoint_student_id)


def correct_attendance(
    *,
    actor_id: Any,
    session_id: Any,
    student_id: Any,
    new_status: str,
    attendance_record: Optional[AttendanceRecordLike],
    audit_logger: Any,
    reason: Optional[str] = None,
    authorization_checker: Optional[Any] = None,
) -> AttendanceRecordLike:
    """Apply an authorized correction while retaining a traceable audit record."""
    # BR-042: corrections must not silently overwrite history; any correction must
    # log an explicit audit trail.
    if attendance_record is None:
        raise AttendanceCorrectionError("Attendance record not found")
    if actor_id is None:
        raise AttendanceCorrectionError("Actor is required for attendance correction")
    if new_status not in {"present", "absent", "late", "excused"}:
        raise AttendanceCorrectionError("Corrected attendance status is required")
    if authorization_checker is None:
        raise AttendanceCorrectionError("An attendance correction authorization check is required")
    try:
        authorized = authorization_checker(
            actor_id=actor_id,
            session_id=session_id,
            student_id=student_id,
        )
    except TypeError:
        authorized = authorization_checker(actor_id, session_id, student_id)
    if not bool(authorized):
        raise AttendanceCorrectionError("Actor is not authorized to correct attendance")
    if audit_logger is None:
        raise AttendanceCorrectionError("An audit logger is required for corrections")

    if hasattr(attendance_record, "status"):
        attendance_record.status = new_status
    if hasattr(attendance_record, "corrected_at"):
        attendance_record.corrected_at = utc_now()
    if hasattr(attendance_record, "correction_note"):
        attendance_record.correction_note = reason or "attendance corrected"
    if hasattr(attendance_record, "is_corrected"):
        attendance_record.is_corrected = True

    attendance_record.save()
    audit_logger(
        action="attendance_corrected",
        session_id=session_id,
        student_id=student_id,
        actor_id=actor_id,
        note=_build_audit_note("attendance_corrected", session_id=session_id, student_id=student_id, actor_id=actor_id, reason=reason),
    )
    return attendance_record


def flag_suspicious_activity(
    *,
    actor_id: Any,
    session_id: Any,
    student_id: Optional[Any] = None,
    details: Optional[str] = None,
    risk_flags: Optional[Sequence[str]] = None,
    audit_logger: Any,
) -> Dict[str, Any]:
    """Create a reviewable suspicious-activity record without assuming misconduct."""
    # BR-064: suspicious activity is informational and reviewable, not automatic
    # misconduct or a permanent accusation.
    if actor_id is None:
        raise AttendanceCorrectionError("Actor is required for suspicious activity review")

    normalized_flags = list(risk_flags or [])
    payload = {
        "session_id": session_id,
        "student_id": student_id,
        "actor_id": actor_id,
        "details": details or "suspicious attendance activity flagged for review",
        "risk_flags": normalized_flags,
        "status": "review_required",
    }
    audit_logger(
        action="attendance_suspicious_activity",
        session_id=session_id,
        student_id=student_id,
        actor_id=actor_id,
        note=_build_audit_note("attendance_suspicious_activity", session_id=session_id, student_id=student_id, actor_id=actor_id, reason=payload["details"]),
    )
    return payload
