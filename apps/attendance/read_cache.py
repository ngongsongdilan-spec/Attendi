"""Read-through attendance snapshots, stored outside PostgreSQL.

Read values live in the *shared* default cache (Redis when configured,
otherwise the database cache). They must not use the polling cache: that
cache is per-worker memory when Redis is absent, so every serverless
instance would hold its own stale copy and pollers would see values jump
between instances. The polling cache is only for rate-limit counters.

A short lock lets one worker rebuild an expired value while other requests
wait briefly; followers never fall back to their own database query. Cache
outages return 503 instead of amplifying a database outage. All cached
values have a finite TTL for self-repair.
"""

import logging
import time
from uuid import uuid4

from django.core.cache import caches
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from apps.core.errors import TrafficCacheUnavailable

logger = logging.getLogger(__name__)

READ_CACHE = caches["default"]
_MISSING = object()
# Old generations expire naturally; random generation IDs never repeat.
GENERATION_TTL = 600


def cached_read(key, loader, timeout):
    """Return a cached value (including None), allowing only one DB loader.

    A write that lands while a loader is running moves readers to a new
    generation. Instead of failing the request (which made live counts
    flicker during busy sessions), retry the read a few times so the caller
    gets the post-write snapshot.
    """
    generation_key = f"{key}:generation"
    for _attempt in range(3):
        try:
            generation = READ_CACHE.get(generation_key, "initial")
            value_key = f"{key}:v{generation}"
            value = READ_CACHE.get(value_key, _MISSING)
            if value is not _MISSING:
                if READ_CACHE.get(generation_key, "initial") == generation:
                    return value["data"]
                continue
            lock_key = f"{value_key}:loading"
            owns_lock = READ_CACHE.add(lock_key, 1, timeout=15)
        except Exception as exc:
            logger.warning("Attendance cache unavailable", exc_info=True)
            raise TrafficCacheUnavailable() from exc

        if owns_lock:
            try:
                data = loader()
                try:
                    # A write during loading moves readers to a new generation.
                    # Never return or publish data read before that write.
                    if READ_CACHE.get(generation_key, "initial") != generation:
                        continue
                    READ_CACHE.set(value_key, {"data": data}, timeout=timeout)
                    if READ_CACHE.get(generation_key, "initial") != generation:
                        continue
                except TrafficCacheUnavailable:
                    raise
                except Exception as exc:
                    logger.warning("Attendance cache write failed", exc_info=True)
                    raise TrafficCacheUnavailable() from exc
                return data
            finally:
                try:
                    READ_CACHE.delete(lock_key)
                except Exception:
                    logger.warning("Attendance cache lock cleanup failed", exc_info=True)

        # A follower must never run the database loader when the cache is cold.
        for _ in range(5):
            time.sleep(0.05)
            try:
                value = READ_CACHE.get(value_key, _MISSING)
            except Exception as exc:
                logger.warning("Attendance cache wait failed", exc_info=True)
                raise TrafficCacheUnavailable() from exc
            if value is not _MISSING:
                try:
                    if READ_CACHE.get(generation_key, "initial") == generation:
                        return value["data"]
                except Exception as exc:
                    logger.warning("Attendance cache wait failed", exc_info=True)
                    raise TrafficCacheUnavailable() from exc
                raise TrafficCacheUnavailable()
        raise TrafficCacheUnavailable()
    raise TrafficCacheUnavailable()


def invalidate(key):
    """Advance the cache generation now and after commit to close write races."""
    def advance():
        try:
            READ_CACHE.set(f"{key}:generation", uuid4().hex, timeout=GENERATION_TTL)
        except Exception:
            logger.warning("Attendance cache invalidation failed", exc_info=True)

    advance()
    if transaction.get_connection().in_atomic_block:
        transaction.on_commit(advance, robust=True)


def station_key(student_id):
    return f"att:read:station:{student_id}"


def station_session_key(student_id, session_id):
    return f"att:read:station:{student_id}:{session_id}"


def status_key(session_id):
    return f"att:read:status:{session_id}"


def history_key(student_id):
    return f"att:read:history:{student_id}"


def points_key(student_id):
    return f"att:read:points:{student_id}"


def eligibility_key(student_id, offering_id):
    return f"att:read:eligible:{student_id}:{offering_id}"


def station_scan_key(checkpoint_id):
    return f"att:read:station-scans:{checkpoint_id}"


def checkpoints_key(session_id):
    return f"att:read:checkpoints:{session_id}"


def station_assignment(student_id, session_id=None):
    from .models import AttendanceCheckpoint, AttendanceSession

    def load():
        assignments = AttendanceCheckpoint.objects.filter(
            student_id=student_id,
            attendance_session__status=AttendanceSession.Status.ACTIVE,
            attendance_session__expires_at__gt=timezone.now(),
        )
        if session_id is not None:
            assignments = assignments.filter(attendance_session_id=session_id)
        checkpoint = assignments.select_related(
            "attendance_session__class_session__class_definition__course_offering__course"
        ).first()
        if checkpoint is None:
            return None
        session = checkpoint.attendance_session
        return {
            "attendance_session_id": str(session.id),
            "checkpoint_id": str(checkpoint.id),
            "checkpoint_number": checkpoint.checkpoint_number,
            "selection_method": checkpoint.selection_method,
            "course_code": session.class_session.class_definition.course_offering.course.code,
            "class_name": session.class_session.class_definition.name,
            "session_expires_at": session.expires_at,
        }

    key = station_session_key(student_id, session_id) if session_id is not None else station_key(student_id)
    return cached_read(key, load, timeout=60)


def session_snapshot(session_id):
    from apps.academics.models import Enrollment
    from .models import AttendanceSession

    def load():
        session = AttendanceSession.objects.filter(id=session_id).select_related(
            "class_session__class_definition"
        ).first()
        if session is None:
            raise Http404
        offering_id = session.class_session.class_definition.course_offering_id
        eligible = Enrollment.objects.filter(
            course_offering_id=offering_id, status=Enrollment.Status.ACTIVE
        ).count()
        return {
            "status": session.status,
            "started_at": session.started_at,
            "mode": session.mode,
            "expires_at": session.expires_at,
            "expected_headcount": session.expected_headcount,
            "headcount_reached_at": session.headcount_reached_at,
            "lecturer_id": str(session.lecturer_id),
            "offering_id": str(offering_id),
            "total_eligible": eligible,
            # LATE still counts as attended; ABSENT/EXCUSED do not.
            "present": session.records.filter(status__in=["PRESENT", "LATE"]).count(),
        }

    # Counts may lag a scan by up to 12 seconds. Session closure is invalidated
    # immediately so a closed QR never remains active because of this TTL.
    return cached_read(status_key(session_id), load, timeout=12)


def session_checkpoints(session_id):
    from .models import AttendanceCheckpoint

    def load():
        return list(AttendanceCheckpoint.objects.filter(
            attendance_session_id=session_id,
        ).values(
            "id", "checkpoint_number", "student__email",
        ))

    return cached_read(checkpoints_key(session_id), load, timeout=60)


def is_enrolled(student_id, offering_id):
    from apps.academics.models import Enrollment

    return cached_read(
        eligibility_key(student_id, offering_id),
        lambda: Enrollment.objects.filter(
            student_id=student_id,
            course_offering_id=offering_id,
            status=Enrollment.Status.ACTIVE,
        ).exists(),
        timeout=60,
    )


def station_scan_count(checkpoint_id):
    from .models import AttendanceRecord

    return cached_read(
        station_scan_key(checkpoint_id),
        lambda: AttendanceRecord.objects.filter(
            checkpoint_id=checkpoint_id,
            verification_method=AttendanceRecord.VerificationMethod.QR_SCAN,
        ).count(),
        timeout=12,
    )
