"""Publish a release note to every user's in-app notification feed.

The notification rows are created lazily the next time each user loads their
inbox, so running this is cheap even with many accounts. Re-running the same
version updates the release note; existing delivery is not duplicated.
"""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.notifications.models import PlatformUpdate


class Command(BaseCommand):
    help = "Create or update a platform update that will appear in users' notifications."

    def add_arguments(self, parser):
        parser.add_argument("--release-version", required=True, dest="release_version", help="Unique release id, e.g. 2026-10-26.1")
        parser.add_argument("--title", required=True, help="Notification title")
        parser.add_argument("--message", default="", help="Notification body")
        parser.add_argument("--message-file", help="Read the body from a text file")
        parser.add_argument("--inactive", action="store_true", help="Save but do not deliver yet")

    def handle(self, *args, **options):
        if options["message_file"]:
            path = Path(options["message_file"])
            if not path.exists():
                raise CommandError(f"Message file not found: {path}")
            message = path.read_text(encoding="utf-8")
        else:
            message = options["message"]

        update, created = PlatformUpdate.objects.update_or_create(
            version=options["release_version"],
            defaults={
                "title": options["title"],
                "message": message,
                "is_active": not options["inactive"],
                "published_at": timezone.now(),
            },
        )
        action = "Created" if created else "Updated"
        state = "inactive" if not update.is_active else "active"
        self.stdout.write(
            self.style.SUCCESS(f"{action} platform update {update.version} ({state}): {update.title}")
        )
