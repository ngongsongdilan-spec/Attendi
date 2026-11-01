"""Device identity and shared-device correlation services.

Device identities are opaque browser-installation identifiers. They are used
only to correlate attendance submissions inside one session; they are never an
authentication factor and never replace the normal attendance checks.

The raw credential is returned to the browser once and only its digest is
stored. All grouping writes run inside the caller's transaction, with the
session row locked by the scan path and a unique (session, device) constraint
as the final protection against duplicate groups.
"""
import hashlib
import hmac
import secrets
from datetime import timedelta
from uuid import UUID

from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.audit.services import audit

from .models import AttendanceDevice, AttendanceDeviceGroup, AttendanceRecord


def hash_credential(credential):
    """Return the deterministic digest stored for a high-entropy credential."""
    return hashlib.sha256(credential.encode("utf-8")).hexdigest()


def issue_device(*, user_agent=""):
    """Create a new device identity and return ``(device, raw_credential)``."""
    credential = secrets.token_urlsafe(32)
    device = AttendanceDevice.objects.create(
        credential_hash=hash_credential(credential),
        user_agent=(user_agent or "")[:255],
    )
    return device, credential


def resolve_device(device_id, credential, *, touch=True):
    """Return the device only when the opaque credential matches its digest."""
    if not device_id or not credential:
        return None
    try:
        device_uuid = UUID(str(device_id))
    except (TypeError, ValueError, AttributeError):
        return None
    device = AttendanceDevice.objects.filter(id=device_uuid).first()
    if device is None:
        return None
    if not hmac.compare_digest(device.credential_hash, hash_credential(credential)):
        return None
    if touch:
        now = timezone.now()
        if now - device.last_seen_at > timedelta(minutes=1):
            AttendanceDevice.objects.filter(pk=device.pk).update(last_seen_at=now)
            device.last_seen_at = now
    return device


def register_device(*, device_id=None, credential=None, user_agent=""):
    """Verify an existing identity or issue a replacement.

    Returns ``(device, credential, created, replaced)``. An unknown or invalid
    identity is replaced rather than trusted, so a cleared browser store or a
    database reset cannot make the platform accept an arbitrary device id.
    """
    existing = resolve_device(device_id, credential) if device_id and credential else None
    if existing is not None:
        return existing, credential, False, False
    device, new_credential = issue_device(user_agent=user_agent)
    return device, new_credential, True, bool(device_id or credential)


def _refresh_group_state(group):
    """Recompute counts/status/version while the group row is locked."""
    records = AttendanceRecord.objects.select_for_update().filter(device_group=group)
    counts = records.aggregate(
        total=Count("id"),
        verified=Count("id", filter=Q(integrity_verified_at__isnull=False)),
    )
    total = counts["total"] or 0
    verified = counts["verified"] or 0

    if total >= 2 and verified >= total:
        integrity_status = AttendanceDeviceGroup.IntegrityStatus.REVIEWED
    elif total >= 2:
        integrity_status = AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED
    else:
        integrity_status = AttendanceDeviceGroup.IntegrityStatus.NORMAL

    group.student_count = total
    group.integrity_status = integrity_status
    group.version += 1
    if integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEWED:
        if group.reviewed_at is None:
            group.reviewed_at = timezone.now()
    else:
        group.reviewed_at = None
    group.save(update_fields=[
        "student_count", "integrity_status", "version", "reviewed_at", "updated_at",
    ])
    return group


def _audit_group(group, *, action, actor=None, request=None, extra=None):
    metadata = {
        "device_group_id": str(group.id),
        "device_id": str(group.device_id),
        "student_count": group.student_count,
        "integrity_status": group.integrity_status,
        "version": group.version,
    }
    if extra:
        metadata.update(extra)
    return audit(
        user=actor,
        action=action,
        resource_type="AttendanceSession",
        resource_id=group.attendance_session_id,
        request=request,
        metadata=metadata,
    )


def attach_record_to_device(record, device, *, request=None):
    """Attach one attendance record to its session device group atomically."""
    if device is None:
        return None

    with transaction.atomic():
        group = (
            AttendanceDeviceGroup.objects.select_for_update()
            .filter(attendance_session_id=record.attendance_session_id, device=device)
            .first()
        )
        if group is None:
            try:
                with transaction.atomic():
                    group = AttendanceDeviceGroup.objects.create(
                        attendance_session_id=record.attendance_session_id,
                        device=device,
                    )
            except IntegrityError:
                # Another transaction created it first; the unique constraint
                # is the authority, so lock and reuse the winner.
                group = AttendanceDeviceGroup.objects.select_for_update().get(
                    attendance_session_id=record.attendance_session_id,
                    device=device,
                )

        previous_status = group.integrity_status
        record.device = device
        record.device_group = group
        record.save(update_fields=["device", "device_group", "updated_at"])
        group = _refresh_group_state(group)

        shared_now = (
            group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED
            and previous_status != AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED
        )
        _audit_group(
            group,
            action=(
                "ATTENDANCE_SHARED_DEVICE_DETECTED" if shared_now
                else "ATTENDANCE_DEVICE_GROUP_UPDATED"
            ),
            actor=record.student,
            request=request,
            extra={"record_id": str(record.id), "student_id": str(record.student_id)},
        )
    return group


def detach_record_from_device(record, *, actor=None, request=None):
    """Remove a record from its device group before the record is deleted."""
    if not record.device_group_id:
        return None

    with transaction.atomic():
        group = (
            AttendanceDeviceGroup.objects.select_for_update()
            .filter(pk=record.device_group_id)
            .first()
        )
        if group is None:
            return None
        device_id = group.device_id
        record.device = None
        record.device_group = None
        record.save(update_fields=["device", "device_group", "updated_at"])
        group = _refresh_group_state(group)
        _audit_group(
            group,
            action="ATTENDANCE_DEVICE_GROUP_UPDATED",
            actor=actor,
            request=request,
            extra={"record_id": str(record.id), "student_id": str(record.student_id),
                   "removed_device_id": str(device_id)},
        )
    return group


def verify_group_student(group, student_id, new_status, *, actor, reason="", request=None):
    """Apply one lecturer verification decision and recompute group state.

    Raises ``ValueError`` when the student is not part of this group or the
    requested status is not a final attendance decision.
    """
    if new_status not in {"PRESENT", "ABSENT"}:
        raise ValueError("Verification status must be PRESENT or ABSENT.")

    with transaction.atomic():
        group = AttendanceDeviceGroup.objects.select_for_update().get(pk=group.pk)
        record = (
            AttendanceRecord.objects.select_for_update()
            .filter(device_group=group, student_id=student_id)
            .first()
        )
        if record is None:
            raise ValueError("Student is not part of this device group.")

        old_status = record.status
        record.status = new_status
        record.integrity_verified_at = timezone.now()
        record.integrity_verified_by = actor
        record.save(update_fields=[
            "status", "integrity_verified_at", "integrity_verified_by", "updated_at",
        ])
        group = _refresh_group_state(group)
        _audit_group(
            group,
            action="ATTENDANCE_VERIFIED",
            actor=actor,
            request=request,
            extra={
                "record_id": str(record.id),
                "student_id": str(record.student_id),
                "old_status": old_status,
                "new_status": new_status,
                "reason": reason or "",
            },
        )
    return record, group


def mark_record_verified(record, *, actor, old_status=None, request=None):
    """Mark a general lecturer correction as an integrity decision as well."""
    if not record.device_group_id:
        return None
    with transaction.atomic():
        group = (
            AttendanceDeviceGroup.objects.select_for_update()
            .filter(pk=record.device_group_id)
            .first()
        )
        if group is None:
            return None
        record.integrity_verified_at = timezone.now()
        record.integrity_verified_by = actor
        record.save(update_fields=["integrity_verified_at", "integrity_verified_by", "updated_at"])
        group = _refresh_group_state(group)
        _audit_group(
            group,
            action="ATTENDANCE_VERIFIED",
            actor=actor,
            request=request,
            extra={"record_id": str(record.id), "student_id": str(record.student_id),
                   "old_status": old_status, "new_status": record.status,
                   "reason": "general correction"},
        )
    return group
