"""Attendance services - QR tokens, rotation, scan validation.

Token storage uses Django cache (Redis in production, LocMem in dev).
This satisfies the spec's requirement for temporary QR storage in Redis
while remaining functional without a Redis server during development.

Refs: Tech Stack doc 12 §6-8, Business Rules doc 04 §7-8, API Spec doc 07 §§24-32.
"""
import secrets
import json

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from .models import AttendanceCheckpoint, AttendanceRecord, AttendanceSession

TOKEN_TTL = getattr(settings, "ATTENDANCE_TOKEN_TTL_SECONDS", 10)


def generate_token_key(session_id: str, token: str) -> str:
    return f"att:{session_id}:token:{token}"


def generate_token_for_checkpoint(attendance_session: AttendanceSession, checkpoint) -> dict:
    """Create a single fresh short-lived token for one checkpoint (FR-043)."""
    token = secrets.token_urlsafe(32)
    value = json.dumps({
        "attendance_session_id": str(attendance_session.id),
        "checkpoint_id": str(checkpoint.id),
        "checkpoint_number": checkpoint.checkpoint_number,
        "student_email": checkpoint.student.email,
    })
    cache.set(generate_token_key(str(attendance_session.id), token), value, timeout=TOKEN_TTL)
    # Reverse lookup so a scan can find its session in O(1).
    cache.set(f"att:token:{token}", value, timeout=TOKEN_TTL)
    return {
        "checkpoint_id": str(checkpoint.id),
        "checkpoint_number": checkpoint.checkpoint_number,
        "token": token,
    }


def generate_session_token(attendance_session: AttendanceSession) -> dict:
    """Create a single networked QR token for the whole session (projector mode).

    Not tied to any student station; scans against it are regular QR_SCAN
    entries earning standard scan points (BR-035 fallback when no stations
    have been selected yet).
    """
    token = secrets.token_urlsafe(32)
    value = json.dumps({
        "attendance_session_id": str(attendance_session.id),
        "checkpoint_id": None,
        "checkpoint_number": None,
        "student_email": "",
    })
    cache.set(generate_token_key(str(attendance_session.id), token), value, timeout=TOKEN_TTL)
    cache.set(f"att:token:{token}", value, timeout=TOKEN_TTL)
    return {
        "checkpoint_id": None,
        "checkpoint_number": 0,
        "token": token,
    }


def generate_tokens_for_session(attendance_session: AttendanceSession):
    """Generate cryptographically random tokens for each checkpoint (FR-042).

    Each token is short-lived (BR-035, default 10 seconds) and rotated by
    requesting fresh tokens periodically. Tokens are stored in cache,
    NOT in PostgreSQL.

    In projector mode (or before any stations are selected) a single
    session-level token is returned instead.
    """
    checkpoints = list(attendance_session.checkpoints.select_related("student").all())
    if not checkpoints or attendance_session.mode == AttendanceSession.SessionMode.PROJECTOR:
        tokens = [generate_session_token(attendance_session)]
    else:
        tokens = [generate_token_for_checkpoint(attendance_session, cp) for cp in checkpoints]
    return {
        "expires_in_seconds": TOKEN_TTL,
        "tokens": tokens,
    }


def validate_and_record_scan(token: str, requesting_user) -> dict:
    """Validate a scanned token and record attendance if valid (FR-045, API Spec §30).

    Returns a dict with status info and HTTP status code.
    """
    key = None
    matched_session_id = None
    token_data = None

    # Search cache for matching token across active sessions
    # We store tokens with known keys, so we iterate the token directly
    # Actually we need to find which session this token belongs to.
    # Strategy: list all att:{session_id}:token: keys is expensive.
    # Instead: when generating tokens, we also store a reverse lookup:
    # att:token:{token} -> session_id
    # Let's implement both directions for O(1) lookup.
    reverse_key = f"att:token:{token}"
    token_data_raw = cache.get(reverse_key)
    if token_data_raw:
        token_data = json.loads(token_data_raw)
        matched_session_id = token_data["attendance_session_id"]
        cache_key = generate_token_key(matched_session_id, token)
        cache_data = cache.get(cache_key)
        if cache_data is None:
            # Token expired
            return {"success": False, "error_code": "TOKEN_EXPIRED", "message": "QR code has expired. Please scan the current QR code.", "http_status": 410}
        token_data = json.loads(cache_data)
    else:
        return {"success": False, "error_code": "TOKEN_INVALID", "message": "Invalid QR code.", "http_status": 400}

    attendance_session_id = token_data["attendance_session_id"]

    with transaction.atomic():
        session = AttendanceSession.objects.select_for_update().get(id=attendance_session_id)

        # BR-030: Attendance requires active session
        if not session.is_active:
            return {"success": False, "error_code": "SESSION_EXPIRED", "message": "Attendance is closed.", "http_status": 410}

        # BR-031: Student must be eligible for the course
        offering = session.course_offering
        from apps.academics.models import Enrollment
        is_enrolled = Enrollment.objects.filter(
            student=requesting_user,
            course_offering=offering,
            status=Enrollment.Status.ACTIVE,
        ).exists()
        if not is_enrolled:
            return {"success": False, "error_code": "NOT_ENROLLED", "message": "You are not enrolled in this course.", "http_status": 403}

        # BR-040: One attendance record per session
        already_attended = AttendanceRecord.objects.filter(
            attendance_session=session,
            student=requesting_user,
        ).exists()
        if already_attended:
            return {"success": False, "error_code": "ALREADY_ATTENDED", "message": "Attendance already recorded for this session.", "http_status": 409}

        # BR-063: Attendance must be for the authenticated student
        checkpoint_id = token_data.get("checkpoint_id")

        # Station capacity: ONLY auto-selected student stations serve at most
        # SCANS_PER_STATION classmates (FR-047). Teacher-selected stations and
        # projector checkpoints are unlimited.
        from .points import SCANS_PER_STATION, award_scan_points, award_station_points
        from apps.notifications.models import Notification

        checkpoint = None
        if checkpoint_id:
            checkpoint = AttendanceCheckpoint.objects.select_for_update().select_related("student").filter(
                id=checkpoint_id
            ).first()
            if checkpoint is None:
                return {"success": False, "error_code": "TOKEN_INVALID", "message": "Invalid QR code.", "http_status": 400}

        is_auto_station = (
            checkpoint is not None
            and checkpoint.student.role == "STUDENT"
            and checkpoint.selection_method == AttendanceCheckpoint.SelectionMethod.AUTO
        )
        if is_auto_station:
            scans_served = AttendanceRecord.objects.filter(
                checkpoint=checkpoint, verification_method=AttendanceRecord.VerificationMethod.QR_SCAN
            ).count()
            if scans_served >= SCANS_PER_STATION:
                return {
                    "success": False,
                    "error_code": "STATION_FULL",
                    "message": f"This auto-selected station already served {SCANS_PER_STATION} classmates. Please scan another station or the projector.",
                    "http_status": 409,
                }

        record = AttendanceRecord.objects.create(
            attendance_session=session,
            student=requesting_user,
            checkpoint_id=checkpoint_id,
            verification_method="QR_SCAN",
        )

        # Points: scanners earn bonus points at student stations (5 vs 3);
        # the station owner earns station points on first use (FR-048).
        award_scan_points(session, requesting_user, checkpoint=checkpoint)
        is_student_station = checkpoint is not None and checkpoint.student.role == "STUDENT"
        if is_student_station:
            award_station_points(session, checkpoint)
            # Notify when an auto station reaches its scan cap.
            if is_auto_station:
                served_now = AttendanceRecord.objects.filter(
                    checkpoint=checkpoint, verification_method=AttendanceRecord.VerificationMethod.QR_SCAN
                ).count()
                if served_now == SCANS_PER_STATION:
                    Notification.objects.create(
                        user=checkpoint.student,
                        type="ATTENDANCE",
                        title="✅ Station complete - all scans used!",
                        message=(f"All {SCANS_PER_STATION} classmates have scanned your station in "
                                 f"{session.class_session.class_definition.course_offering.course.code}. "
                                 "Your 10 station points are locked in."),
                        reference_type="AttendanceSession",
                        reference_id=session.id,
                    )

        # Headcount: auto-close session if expected_headcount is set and reached.
        if session.expected_headcount is not None:
            checked_in = AttendanceRecord.objects.filter(attendance_session=session).count()
            if checked_in >= session.expected_headcount and session.headcount_reached_at is None:
                session.headcount_reached_at = timezone.now()
                session.status = AttendanceSession.Status.CLOSED
                session.save(update_fields=["headcount_reached_at", "status", "updated_at"])
                Notification.objects.create(
                    user=session.lecturer,
                    type="ATTENDANCE",
                    title="🎯 Headcount reached - session closed!",
                    message=(f"All {session.expected_headcount} expected students have checked in for "
                             f"{session.class_session.class_definition.course_offering.course.code}."),
                    reference_type="AttendanceSession",
                    reference_id=session.id,
                )

    # Clean up token (cannot be reused - BR-038)
    cache.delete(generate_token_key(attendance_session_id, token))
    cache.delete(reverse_key)

    return {
        "success": True,
        "attendance_record_id": str(record.id),
        "message": "Attendance recorded.",
        "http_status": 201,
    }
