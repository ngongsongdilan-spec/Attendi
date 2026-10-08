"""Close attendance sessions that never expired but were abandoned.

Run from cron/Celery-beat. Sessions whose window has elapsed are lazily
marked EXPIRED by the system so scans can never land on a stale session.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.attendance.models import AttendanceSession


class Command(BaseCommand):
    help = "Mark abandonment ATTENDANCE sessions EXPIRED so late scans are rejected."

    def handle(self, *args, **options):
        now = timezone.now()
        queryset = AttendanceSession.objects.filter(
            status=AttendanceSession.Status.ACTIVE,
            expires_at__lte=now,
        )
        count = queryset.count()
        queryset.update(status=AttendanceSession.Status.EXPIRED)
        self.stdout.write(self.style.SUCCESS(f"Closed {count} expired attendance session(s)."))