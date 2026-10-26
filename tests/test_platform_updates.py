"""Release-note delivery through the normal notification feed."""
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.models import Notification, PlatformUpdate


def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestPlatformUpdates:
    def test_active_update_is_delivered_exactly_once(self, student_user):
        update = PlatformUpdate.objects.create(
            version="2026-10-26.1",
            title="What's new",
            message="Auto sign-in after registration",
        )
        client = auth_client(student_user)

        first = client.get("/api/v1/notifications/").json()["data"]
        second = client.get("/api/v1/notifications/").json()["data"]

        assert [n["title"] for n in first] == ["What's new"]
        assert [n["title"] for n in second] == ["What's new"]
        assert first[0]["type"] == "PLATFORM_UPDATE"
        assert first[0]["reference_type"] == "PlatformUpdate"
        assert first[0]["reference_id"] == str(update.id)
        assert first[0]["message"] == "Auto sign-in after registration"
        assert Notification.objects.filter(user=student_user).count() == 1

    def test_inactive_update_is_not_delivered(self, student_user):
        PlatformUpdate.objects.create(
            version="draft",
            title="Not ready",
            is_active=False,
        )
        body = auth_client(student_user).get("/api/v1/notifications/").json()["data"]
        assert body == []
        assert Notification.objects.filter(user=student_user).count() == 0

    def test_future_update_is_not_delivered_until_its_time(self, student_user):
        PlatformUpdate.objects.create(
            version="later",
            title="Later",
            published_at=timezone.now() + timedelta(days=1),
        )
        body = auth_client(student_user).get("/api/v1/notifications/").json()["data"]
        assert body == []

    def test_a_new_update_becomes_unread_again(self, student_user):
        PlatformUpdate.objects.create(version="v1", title="First")
        client = auth_client(student_user)
        client.get("/api/v1/notifications/")
        Notification.objects.filter(user=student_user).update(read_at=timezone.now())

        PlatformUpdate.objects.create(version="v2", title="Second")
        unread = client.get("/api/v1/notifications/", {"unread": "true"}).json()["data"]

        assert [n["title"] for n in unread] == ["Second"]

    def test_each_user_gets_their_own_copy(self, student_user, student2_user):
        PlatformUpdate.objects.create(version="v1", title="Shared release")

        mine = auth_client(student_user).get("/api/v1/notifications/").json()["data"]
        theirs = auth_client(student2_user).get("/api/v1/notifications/").json()["data"]

        assert len(mine) == 1 and len(theirs) == 1
        assert mine[0]["id"] != theirs[0]["id"]
        assert Notification.objects.filter(type="PLATFORM_UPDATE").count() == 2

    def test_publish_command_is_idempotent(self, student_user):
        call_command("publish_platform_update", release_version="v1", title="First", message="one")
        call_command("publish_platform_update", release_version="v1", title="First edited", message="two")

        assert PlatformUpdate.objects.count() == 1
        update = PlatformUpdate.objects.get()
        assert update.title == "First edited"
        assert update.message == "two"

        body = auth_client(student_user).get("/api/v1/notifications/").json()["data"]
        assert [n["title"] for n in body] == ["First edited"]
