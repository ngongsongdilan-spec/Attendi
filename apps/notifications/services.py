"""Delivery helpers for release notes."""
import uuid

from django.utils import timezone

from .models import Notification, PlatformUpdate

PLATFORM_UPDATE_REFERENCE = "PlatformUpdate"


def sync_platform_updates(user):
    """Create this user's notification for every published update.

    Idempotent and safe under concurrent requests: the partial unique
    constraint on (user, reference_type, reference_id) plus
    ``ignore_conflicts`` makes duplicate inserts harmless.
    """
    seen_ids = set(
        Notification.objects.filter(
            user=user,
            type=Notification.NotificationType.PLATFORM_UPDATE,
            reference_type=PLATFORM_UPDATE_REFERENCE,
        ).values_list("reference_id", flat=True)
    )

    missing = []
    for update in PlatformUpdate.objects.filter(
        is_active=True,
        published_at__lte=timezone.now(),
    ).order_by("-published_at")[:20]:
        if update.id in seen_ids:
            continue
        missing.append(
            Notification(
                id=uuid.uuid4(),
                user=user,
                type=Notification.NotificationType.PLATFORM_UPDATE,
                title=update.title,
                message=update.message,
                reference_type=PLATFORM_UPDATE_REFERENCE,
                reference_id=update.id,
            )
        )

    if missing:
        Notification.objects.bulk_create(missing, ignore_conflicts=True)
