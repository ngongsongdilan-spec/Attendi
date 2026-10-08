"""Attendance API views (API Spec doc 07 §§24-32).

Start session -> select checkpoints -> generate tokens -> rotate -> students scan.
"""
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.academics.models import ClassDefinition, ClassSchedule, ClassSession, CourseOffering, Enrollment
from apps.core.permissions import IsLecturer, IsLecturerOrAdmin, IsStudent
from apps.audit.services import audit

from .models import AttendanceCheckpoint, AttendanceRecord, AttendanceSession, PointsLedger
from .points import POINTS, award_manual_points, auto_select_stations
from .serializers import (
    AttendanceCheckpointSerializer,
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
    ScanRequestSerializer,
)
from .token_store import generate_tokens_for_session, validate_and_record_scan

ADMIN_ROLES = {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}


def _parse_headcount(value):
    """Return a valid positive int or None."""
    if value is None:
        return None
    try:
        n = int(value)
        return n if n > 0 else None
    except (TypeError, ValueError):
        return None


class StartAttendanceView(APIView):
    """POST /api/v1/class-sessions/{session_id}/attendance

    Lecturer starts an attendance session for a class.
    """
    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_start"

    def post(self, request, session_id):
        class_session = get_object_or_404(ClassSession, id=session_id)
        if class_session.class_definition.lecturer_id != request.user.id and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You are not the assigned lecturer for this class."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        duration = min(
            int(request.data.get("duration_seconds", getattr(settings, "ATTENDANCE_SESSION_DEFAULT_SECONDS", 60))),
            getattr(settings, "ATTENDANCE_SESSION_MAX_SECONDS", 600),
        )
        now = timezone.now()
        session = AttendanceSession.objects.create(
            class_session=class_session,
            lecturer=request.user,
            started_at=now,
            expires_at=now + timezone.timedelta(seconds=duration),
            expected_headcount=_parse_headcount(request.data.get("expected_headcount")),
        )
        audit(user=request.user, action="ATTENDANCE_STARTED", resource_type="AttendanceSession", resource_id=session.id, request=request)
        return Response(AttendanceSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class FlexibleStartAttendanceView(APIView):
    """POST /api/v1/attendance/start-flex/

    Lecturer-friendly attendance start. Prefills from the weekly timetable
    when a schedule_id is given, but also accepts a fully custom time for
    swapped/rescheduled periods.

    Body:
      offering_id      (required)
      schedule_id      (optional) - prefill class_type/location from timetable
      class_type       (optional, default from schedule or LECTURE)
      starts_at        (optional ISO datetime, default now)
      ends_at          (optional ISO datetime, default starts_at + 2h)
      duration_seconds (optional token validity, default 60, max 600)
    """

    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_start"

    def post(self, request):
        offering_id = request.data.get("offering_id")
        if not offering_id:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "offering_id is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        offering = get_object_or_404(CourseOffering, id=offering_id)
        if offering.lecturer_id != request.user.id and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You are not the assigned lecturer for this course."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        schedule = None
        schedule_id = request.data.get("schedule_id")
        if schedule_id:
            schedule = get_object_or_404(ClassSchedule, id=schedule_id, course_offering=offering)

        class_type = request.data.get("class_type") or (schedule.class_type if schedule else ClassDefinition.ClassType.LECTURE)

        # Find-or-create the ClassDefinition for this offering + class type.
        default_name = f"{offering.course.code} {class_type.title()}"
        class_def, _ = ClassDefinition.objects.get_or_create(
            course_offering=offering,
            class_type=class_type,
            defaults={"lecturer": offering.lecturer or request.user, "name": default_name,
                      "location": schedule.location if schedule else ""},
        )

        # Resolve times: explicit -> schedule -> now.
        starts_at = request.data.get("starts_at")
        if starts_at:
            try:
                starts_at = timezone.datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
                if timezone.is_naive(starts_at):
                    starts_at = timezone.make_aware(starts_at)
            except (ValueError, AttributeError):
                return Response(
                    {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid starts_at datetime."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            starts_at = timezone.now()

        ends_at = request.data.get("ends_at")
        if ends_at:
            try:
                ends_at = timezone.datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
                if timezone.is_naive(ends_at):
                    ends_at = timezone.make_aware(ends_at)
            except (ValueError, AttributeError):
                return Response(
                    {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid ends_at datetime."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif schedule:
            duration = timezone.datetime.combine(starts_at.date(), schedule.end_time) - timezone.datetime.combine(
                starts_at.date(), schedule.start_time
            )
            ends_at = starts_at + duration
        else:
            ends_at = starts_at + timezone.timedelta(hours=2)

        class_session = ClassSession.objects.create(
            class_definition=class_def, starts_at=starts_at, ends_at=ends_at, status="ONGOING"
        )

        duration = min(
            int(request.data.get("duration_seconds", getattr(settings, "ATTENDANCE_SESSION_DEFAULT_SECONDS", 60))),
            getattr(settings, "ATTENDANCE_SESSION_MAX_SECONDS", 600),
        )
        now = timezone.now()
        mode = request.data.get("mode")
        if mode not in {AttendanceSession.SessionMode.PROJECTOR, AttendanceSession.SessionMode.STATIONS}:
            mode = AttendanceSession.SessionMode.STATIONS

        # One live attendance session per class at a time. Starting another
        # supersedes the previous one instead of piling up duplicates.
        superseded = 0
        for existing in AttendanceSession.objects.filter(
            class_session__class_definition=class_def,
            status=AttendanceSession.Status.ACTIVE,
            expires_at__gt=now,
        ):
            if existing.lecturer_id == request.user.id:
                existing.status = AttendanceSession.Status.CLOSED
                existing.save(update_fields=["status"])
                superseded += 1

        session = AttendanceSession.objects.create(
            class_session=class_session,
            lecturer=request.user,
            started_at=now,
            expires_at=now + timezone.timedelta(seconds=duration),
            expected_headcount=_parse_headcount(request.data.get("expected_headcount")),
            mode=mode,
        )
        audit(user=request.user, action="ATTENDANCE_STARTED_FLEX", resource_type="AttendanceSession", resource_id=session.id,
              request=request, metadata={"offering_id": str(offering.id), "schedule_id": schedule_id or None})
        payload = AttendanceSessionSerializer(session).data
        payload["class_session_id"] = str(class_session.id)
        payload["class_definition_id"] = str(class_def.id)
        payload["course_code"] = offering.course.code
        payload["eligible_students"] = Enrollment.objects.filter(
            course_offering=offering, status=Enrollment.Status.ACTIVE
        ).count()
        return Response(payload, status=status.HTTP_201_CREATED)


# NOTE: a `get` listing an attendance session's checkpoints used to sit here.
# It took an `attendance_session_id` that this URL does not supply, so a GET to
# /attendance/start-flex/ raised TypeError -> 500, and it duplicated
# CheckpointsView.get, which serves the same data at
# /attendance/{attendance_session_id}/checkpoints/.


class AutoSelectStationsView(APIView):
    """POST /api/v1/attendance/{session_id}/checkpoints/auto-select {count?}

    System picks a few of the most consistent attendees at random as QR
    stations (FR-047). Auto stations earn full points when used.
    """

    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_admin"

    def post(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if session.lecturer_id != request.user.id and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the session lecturer can select stations."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not session.is_active:
            return Response(
                {"success": False, "error": {"code": "SESSION_EXPIRED", "message": "Attendance session is no longer active."}},
                status=status.HTTP_410_GONE,
            )
        min_verified = getattr(settings, "ATTENDANCE_AUTO_MIN_VERIFIED", 15)
        verified_count = (
            AttendanceRecord.objects.filter(attendance_session=session)
            .values("student_id")
            .distinct()
            .count()
        )
        if verified_count < min_verified:
            return Response(
                {"success": False, "error": {"code": "NOT_ENOUGH_ATTENDANCE",
                 "message": f"Auto-select needs at least {min_verified} students checked in for this session first "
                            f"(currently {verified_count}). Stations are picked only from students proven present - "
                            "have a few more students scan, then try again."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        max_stations = min(
            getattr(settings, "ATTENDANCE_MAX_CHECKPOINTS", 10),
            getattr(settings, "ATTENDANCE_MAX_AUTO_STATIONS", 3),
        )
        try:
            count = int(request.data.get("count", 3))
        except (TypeError, ValueError):
            count = 3
        auto_already = session.checkpoints.filter(selection_method="AUTO").count()
        if auto_already >= max_stations:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": f"Auto-selection is capped at {max_stations} stations per session."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        count = max(1, min(count, max_stations - auto_already, max_stations - session.checkpoints.count()))
        if count <= 0:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Station limit reached."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = auto_select_stations(session, count)
        return Response({
            "selected": AttendanceCheckpointSerializer(created, many=True).data,
            "total_stations": session.checkpoints.count(),
            "auto_stations_remaining": max_stations - session.checkpoints.filter(selection_method="AUTO").count(),
            "scans_per_station": getattr(settings, "ATTENDANCE_SCANS_PER_STATION", 3),
        }, status=status.HTTP_201_CREATED)


class ManualAttendanceView(APIView):
    """POST /api/v1/attendance/{session_id}/manual {student_id, status?}

    Lecturer manually adds a student who missed the QR window.
    Manual entries earn ZERO points (FR-048) to discourage skipping the scan.
    """

    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_admin"

    def post(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if session.lecturer_id != request.user.id and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the session lecturer can add manual attendance."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        student_id = request.data.get("student_id")
        new_status = request.data.get("status", "PRESENT")
        if new_status not in {"PRESENT", "LATE", "ABSENT", "EXCUSED"}:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid status."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.academics.models import Enrollment
        if not Enrollment.objects.filter(student_id=student_id, course_offering=session.course_offering, status=Enrollment.Status.ACTIVE).exists():
            return Response(
                {"success": False, "error": {"code": "NOT_ELIGIBLE", "message": "Student is not enrolled in this course."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record, created = AttendanceRecord.objects.get_or_create(
            attendance_session=session, student_id=student_id,
            defaults={"verification_method": AttendanceRecord.VerificationMethod.MANUAL, "status": new_status},
        )
        if created:
            award_manual_points(session, student_id=student_id)
        return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_201_CREATED if created else 200)


class StudentOfClassView(APIView):
    """POST /api/v1/attendance/{session_id}/student-of-class/

    Algorithm picks one attendee as Student of the Class (+10 pts).
    Never repeats for the same course; still eligible for other courses.
    Idempotent - calling twice returns the same winner.
    """

    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]

    def post(self, request, attendance_session_id):
        from .points import award_student_of_class

        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if session.lecturer_id != request.user.id and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the session lecturer can pick the Student of the Class."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        winner = award_student_of_class(session)
        if winner is None:
            return Response(
                {"success": False, "error": {"code": "NO_CANDIDATES", "message": "No eligible attendees - everyone qualified has already been Student of the Class for this course."}},
                status=status.HTTP_409_CONFLICT,
            )
        return Response({
            "student_id": str(winner.student_id),
            "student_name": winner.student.get_full_name(),
            "student_email": winner.student.email,
            "points": winner.points,
            "category": winner.category,
            "is_special_day": winner.points != 10,
        })


class MyStationView(APIView):
    """GET /api/v1/students/me/station - the student's active station
    assignment, if any (so their phone can display the rotating QR)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        checkpoint = AttendanceCheckpoint.objects.filter(
            student=request.user, attendance_session__status=AttendanceSession.Status.ACTIVE
        ).select_related("attendance_session", "attendance_session__class_session__class_definition__course_offering__course").first()
        if checkpoint is None or not checkpoint.attendance_session.is_active:
            return Response(None)
        session = checkpoint.attendance_session
        return Response({
            "attendance_session_id": str(session.id),
            "checkpoint_id": str(checkpoint.id),
            "checkpoint_number": checkpoint.checkpoint_number,
            "selection_method": checkpoint.selection_method,
            "course_code": session.class_session.class_definition.course_offering.course.code,
            "class_name": session.class_session.class_definition.name,
            "session_expires_at": session.expires_at,
        })


class MyPointsView(APIView):
    """GET /api/v1/students/me/points - total points + breakdown."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .points import POINTS, SPECIAL_DAY_MULTIPLIER, is_special_day

        entries = PointsLedger.objects.filter(student=request.user).select_related("attendance_session")
        total = sum(e.points for e in entries)
        by_category = {}
        for e in entries:
            by_category[e.category] = by_category.get(e.category, 0) + e.points
        birthday = is_special_day(request.user)
        return Response({
            "total_points": total,
            "points_config": POINTS,
            "special_day_multiplier": SPECIAL_DAY_MULTIPLIER if birthday else 1,
            "is_special_day": birthday,
            "by_category": by_category,
            "recent": [
                {
                    "category": e.category,
                    "points": e.points,
                    "session_date": e.attendance_session.started_at.date().isoformat(),
                }
                for e in entries[:10]
            ],
        })


class StationTokenView(APIView):
    """GET /api/v1/attendance/{session_id}/my-station-token/

    A student serving as a station requests a fresh 10-second token for
    their own checkpoint. Their phone displays the rotating QR; classmates
    scan it. Backend remains the token authority (BR-061).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        checkpoint = session.checkpoints.filter(student=request.user).first()
        if checkpoint is None:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You are not a station in this session."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not session.is_active:
            return Response(
                {"success": False, "error": {"code": "SESSION_EXPIRED", "message": "Attendance is closed."}},
                status=status.HTTP_410_GONE,
            )
        from .token_store import TOKEN_TTL, generate_token_for_checkpoint
        data = generate_token_for_checkpoint(session, checkpoint)
        scans_at_station = checkpoint.records.filter(verification_method="QR_SCAN").count()
        is_auto = checkpoint.selection_method == "AUTO"
        scans_remaining = None
        if is_auto:
            from .points import SCANS_PER_STATION
            scans_remaining = max(0, SCANS_PER_STATION - scans_at_station)
        return Response({
            "token": data["token"],
            "checkpoint_number": checkpoint.checkpoint_number,
            "selection_method": checkpoint.selection_method,
            "expires_in_seconds": TOKEN_TTL,
            "scans_at_station": scans_at_station,
            "scans_remaining": scans_remaining,
            "total_checked_in": session.records.count(),
            "expected_headcount": session.expected_headcount,
        })


class CheckpointsView(APIView):
    """POST /api/v1/attendance/{session_id}/checkpoints

    Lecturer selects checkpoint students who are physically present (BR-050-053).
    """
    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_admin"

    def post(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if session.lecturer_id != request.user.id:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the session lecturer can select checkpoints."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not session.is_active:
            return Response(
                {"success": False, "error": {"code": "SESSION_EXPIRED", "message": "Attendance session is no longer active."}},
                status=status.HTTP_410_GONE,
            )
        student_ids = request.data.get("student_ids", [])
        max_checkpoints = getattr(settings, "ATTENDANCE_MAX_CHECKPOINTS", 10)
        if len(student_ids) > max_checkpoints:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": f"Maximum {max_checkpoints} checkpoints allowed."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        offering = session.course_offering
        enrolled_ids = set(
            Enrollment.objects.filter(
                course_offering=offering, status=Enrollment.Status.ACTIVE
            ).values_list("student_id", flat=True)
        )
        checkpoints = []
        for sid in student_ids:
            if str(sid) not in {str(e) for e in enrolled_ids}:
                return Response(
                    {"success": False, "error": {"code": "NOT_ELIGIBLE", "message": f"Student {sid} is not enrolled in this course."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Idempotent: re-selecting a student does not raise a duplicate error.
            cp, _created = AttendanceCheckpoint.objects.get_or_create(
                attendance_session=session,
                student_id=sid,
                defaults={"checkpoint_number": session.checkpoints.count() + 1},
            )
            checkpoints.append(cp)
        # Renumber so the stations read 1..n in the order chosen.
        for i, cp in enumerate(session.checkpoints.order_by("created_at"), 1):
            if cp.checkpoint_number != i:
                cp.checkpoint_number = i
                cp.save(update_fields=["checkpoint_number"])
        return Response(AttendanceCheckpointSerializer(checkpoints, many=True).data, status=status.HTTP_201_CREATED)

    def get(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        return Response(AttendanceCheckpointSerializer(session.checkpoints.all(), many=True).data)


class CheckpointDetailView(APIView):
    """DELETE /api/v1/attendance/{session_id}/checkpoints/{checkpoint_id}/

    Removes a station the lecturer picked by mistake."""

    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]

    def delete(self, request, attendance_session_id, checkpoint_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if session.lecturer_id != request.user.id and request.user.role not in {
            "SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN",
        }:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the session lecturer can remove a station."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        checkpoint = get_object_or_404(
            AttendanceCheckpoint, id=checkpoint_id, attendance_session=session
        )
        checkpoint.delete()
        for i, cp in enumerate(session.checkpoints.order_by("created_at"), 1):
            if cp.checkpoint_number != i:
                cp.checkpoint_number = i
                cp.save(update_fields=["checkpoint_number"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class TokensView(APIView):
    """POST /api/v1/attendance/{session_id}/tokens

    Generate new QR tokens (rotation, FR-043).
    """
    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_admin"

    def post(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if session.lecturer_id != request.user.id:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the session lecturer can generate tokens."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not session.is_active:
            return Response(
                {"success": False, "error": {"code": "SESSION_EXPIRED", "message": "Attendance session is no longer active."}},
                status=status.HTTP_410_GONE,
            )
        data = generate_tokens_for_session(session)
        return Response(data)


class ScanView(APIView):
    """POST /api/v1/attendance/scan

    Student scans a QR code token (FR-045, API Spec §29-30).
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_scan"

    def post(self, request):
        serializer = ScanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = validate_and_record_scan(serializer.validated_data["token"], request.user)
        http_status = result.pop("http_status")
        if result.get("success"):
            return Response(result, status=http_status)
        return Response(
            {"success": False, "error": {"code": result["error_code"], "message": result["message"]}},
            status=http_status,
        )


class CloseAttendanceView(APIView):
    """POST /api/v1/attendance/{session_id}/close

    Lecturer manually closes an attendance session (e.g. once the full class
    has checked in). Closes the window for further scans.
    """

    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]

    def post(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if session.lecturer_id != request.user.id and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the session lecturer can close this session."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if session.status != AttendanceSession.Status.ACTIVE:
            return Response(
                {"success": False, "error": {"code": "SESSION_INACTIVE", "message": "Session is already closed or expired."}},
                status=status.HTTP_409_CONFLICT,
            )
        session.status = AttendanceSession.Status.CLOSED
        session.save(update_fields=["status", "updated_at"])
        audit(user=request.user, action="ATTENDANCE_CLOSED", resource_type="AttendanceSession", resource_id=session.id,
              request=request)
        return Response(AttendanceSessionSerializer(session).data)


class AttendanceStatusView(APIView):
    """GET /api/v1/attendance/{session_id} - live status for lecturer."""
    permission_classes = [IsAuthenticated]

    def get(self, request, attendance_session_id):
        session = get_object_or_404(AttendanceSession, id=attendance_session_id)
        if request.user.role == "STUDENT":
            if not Enrollment.objects.filter(
                student=request.user, course_offering=session.course_offering, status=Enrollment.Status.ACTIVE
            ).exists():
                return Response(
                    {"success": False, "error": {"code": "FORBIDDEN", "message": "Access denied."}},
                    status=status.HTTP_403_FORBIDDEN,
                )
        total_eligible = Enrollment.objects.filter(
            course_offering=session.course_offering, status=Enrollment.Status.ACTIVE
        ).count()
        total_present = session.records.count()
        headcount_remaining = None
        if session.expected_headcount is not None:
            headcount_remaining = max(0, session.expected_headcount - total_present)
        return Response({
            "status": session.status,
            "is_active": session.is_active,
            "total_eligible": total_eligible,
            "present": total_present,
            "remaining": total_eligible - total_present,
            "expires_at": session.expires_at,
            "expected_headcount": session.expected_headcount,
            "headcount_remaining": headcount_remaining,
            "headcount_reached_at": session.headcount_reached_at,
        })


class MyAttendanceSessionsView(APIView):
    """GET /api/v1/attendance/sessions/ - the lecturer's own sessions.

    Lets the dashboard rebuild its session list after a page reload instead of
    starting from an empty state. Live sessions are returned first, then the
    most recent finished ones.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AttendanceSession.objects.filter(lecturer=request.user).select_related(
            "class_session",
            "class_session__class_definition",
            "class_session__class_definition__course_offering__course",
        )
        now = timezone.now()
        live = [s for s in qs if s.is_active]
        recent = sorted(
            (s for s in qs if not s.is_active),
            key=lambda s: s.started_at,
            reverse=True,
        )[:10]
        payload = []
        for s in live + recent:
            data = AttendanceSessionSerializer(s).data
            offering = s.course_offering
            # A session whose window has passed is finished for display, whatever
            # the stored status says - otherwise dead sessions look ACTIVE.
            effective_status = s.status
            if s.status == AttendanceSession.Status.ACTIVE and not s.is_active:
                effective_status = AttendanceSession.Status.CLOSED
            data.update({
                "course_code": offering.course.code,
                "class_name": s.class_session.class_definition.name,
                "class_session_id": str(s.class_session_id),
                "is_active": s.is_active,
                "status": effective_status,
                "present": s.records.count(),
                "total_eligible": Enrollment.objects.filter(
                    course_offering=offering, status=Enrollment.Status.ACTIVE
                ).count(),
                "headcount_remaining": (
                    max(0, s.expected_headcount - s.records.count())
                    if s.expected_headcount is not None else None
                ),
            })
            payload.append(data)
        return Response(payload)


class SessionRecordsView(APIView):
    """GET /api/v1/class-sessions/{session_id}/attendance - attendance records for a session.
    Restricted to the lecturer who owns the class (or an admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        cs = get_object_or_404(ClassSession, id=session_id)
        owner = cs.class_definition.lecturer_id
        offering_lecturer = cs.class_definition.course_offering.lecturer_id
        if request.user.id not in {owner, offering_lecturer} and request.user.role not in ADMIN_ROLES:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You can only view attendance for classes you teach."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        sessions = AttendanceSession.objects.filter(class_session=cs)
        records = AttendanceRecord.objects.filter(attendance_session__in=sessions).select_related("student")
        return Response(AttendanceRecordSerializer(records, many=True).data)


class MyAttendanceView(APIView):
    """GET /api/v1/students/me/attendance - student's own attendance history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = AttendanceRecord.objects.filter(student=request.user).select_related(
            "attendance_session", "attendance_session__class_session", "attendance_session__class_session__class_definition"
        )
        result = []
        for r in records:
            cs = r.attendance_session.class_session
            cd = cs.class_definition
            result.append({
                "id": r.id,
                "recorded_at": r.recorded_at,
                "status": r.status,
                "class_name": cd.name,
                "course_code": cd.course_offering.course.code,
                "session_date": cs.starts_at.date().isoformat(),
            })
        return Response(result)


def _owns_record(request, record):
    """Only the lecturer who owns the class session (or an admin) may
    correct/delete a record. Prevents cross-course tampering."""
    lecturer_id = record.attendance_session.lecturer_id
    return lecturer_id == request.user.id or request.user.role in ADMIN_ROLES


class CorrectRecordView(APIView):
    """PATCH /api/v1/attendance/records/{record_id} - correct attendance (BR-042).
    DELETE /api/v1/attendance/records/{record_id} - remove a bad/test record.
    Both actions are recorded in the audit log; never silently overwrite."""
    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]

    def patch(self, request, record_id):
        record = get_object_or_404(AttendanceRecord, id=record_id)
        if not _owns_record(request, record):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You can only correct attendance for classes you teach."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        old_status = record.status
        new_status = request.data.get("status", old_status)
        if new_status not in {"PRESENT", "ABSENT", "LATE", "EXCUSED"}:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid status."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record.status = new_status
        record.save(update_fields=["status", "updated_at"])
        audit(user=request.user, action="ATTENDANCE_CORRECTED", resource_type="AttendanceRecord", resource_id=record.id,
              request=request, metadata={"old_status": old_status, "new_status": new_status, "student_id": str(record.student_id)})
        return Response(AttendanceRecordSerializer(record).data)

    def delete(self, request, record_id):
        """Remove a record entirely (e.g. a test/duplicate entry)."""
        record = get_object_or_404(AttendanceRecord, id=record_id)
        if not _owns_record(request, record):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You can only delete attendance for classes you teach."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        metadata = {
            "student_id": str(record.student_id),
            "status": record.status,
            "session_id": str(record.attendance_session_id),
        }
        PointsLedger.objects.filter(attendance_session=record.attendance_session, student=record.student).delete()
        record.delete()
        audit(user=request.user, action="ATTENDANCE_RECORD_DELETED", resource_type="AttendanceRecord",
              resource_id=record_id, request=request, metadata=metadata)
        return Response(status=status.HTTP_204_NO_CONTENT)
