"""Evict cached read models when attendance writes change their source rows."""

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.academics.models import Enrollment

from .models import AttendanceCheckpoint, AttendanceRecord, AttendanceSession, PointsLedger
from .read_cache import (
    checkpoints_key, eligibility_key, history_key, invalidate, points_key,
    station_key, station_scan_key, station_session_key, status_key,
)


@receiver((post_save, post_delete), sender=AttendanceSession)
def session_changed(sender, instance, **kwargs):
    invalidate(status_key(instance.pk))


@receiver(pre_save, sender=AttendanceCheckpoint)
def checkpoint_previous_owner(sender, instance, **kwargs):
    if instance.pk:
        old = sender.objects.filter(pk=instance.pk).values("student_id", "attendance_session_id").first()
        if old:
            invalidate(station_key(old["student_id"]))
            invalidate(station_session_key(old["student_id"], old["attendance_session_id"]))
            invalidate(checkpoints_key(old["attendance_session_id"]))


@receiver((post_save, post_delete), sender=AttendanceCheckpoint)
def checkpoint_changed(sender, instance, **kwargs):
    invalidate(station_key(instance.student_id))
    invalidate(station_session_key(instance.student_id, instance.attendance_session_id))
    invalidate(checkpoints_key(instance.attendance_session_id))


@receiver((post_save, post_delete), sender=AttendanceRecord)
def record_changed(sender, instance, **kwargs):
    invalidate(history_key(instance.student_id))
    # Live present counts and per-station scan counts are cached too; without
    # this a new scan only appears after the short TTL on each instance.
    invalidate(status_key(instance.attendance_session_id))
    if instance.checkpoint_id:
        invalidate(station_scan_key(instance.checkpoint_id))


@receiver((post_save, post_delete), sender=PointsLedger)
def points_changed(sender, instance, **kwargs):
    invalidate(points_key(instance.student_id))


@receiver(pre_save, sender=Enrollment)
def enrollment_previous_owner(sender, instance, **kwargs):
    if instance.pk:
        old = sender.objects.filter(pk=instance.pk).values("student_id", "course_offering_id").first()
        if old:
            invalidate(eligibility_key(old["student_id"], old["course_offering_id"]))


@receiver((post_save, post_delete), sender=Enrollment)
def enrollment_changed(sender, instance, **kwargs):
    invalidate(eligibility_key(instance.student_id, instance.course_offering_id))
