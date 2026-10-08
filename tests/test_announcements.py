"""Announcement pinning, read receipts and audience scoping (FR-061, FR-063)."""
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.academics.models import Enrollment
from apps.accounts.models import User
from apps.announcements.models import Announcement, AnnouncementRead


@pytest.fixture
def taught_offering(offering, lecturer_user):
    """The base `offering` fixture has no lecturer, so a lecturer could not
    see or post to it. Appoint one."""
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer", "updated_at"])
    return offering


@pytest.fixture
def course_announcement(taught_offering, lecturer_user):
    return Announcement.objects.create(
        scope_type=Announcement.ScopeType.COURSE,
        course_offering=taught_offering,
        title="Scope published",
        content="Groups open on Monday.",
        created_by=lecturer_user,
        published_at=timezone.now(),
    )


@pytest.fixture
def faculty_announcement(cs_department, lecturer_user):
    return Announcement.objects.create(
        scope_type=Announcement.ScopeType.FACULTY,
        faculty=cs_department.faculty,
        title="Whole faculty notice",
        content="Staff meeting Friday.",
        created_by=lecturer_user,
        published_at=timezone.now(),
    )


@pytest.mark.django_db
class TestPinning:
    def test_pin_and_unpin(self, api_client, course_announcement, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/pin/",
            {"pinned": True}, format="json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["data"]["is_pinned"] is True

        off = api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/pin/",
            {"pinned": False}, format="json",
        )
        assert off.json()["data"]["is_pinned"] is False

    def test_pinning_one_unpins_the_others_in_the_same_audience(
        self, api_client, taught_offering, lecturer_user
    ):
        first = Announcement.objects.create(
            scope_type=Announcement.ScopeType.COURSE, course_offering=taught_offering,
            title="First", content="a", created_by=lecturer_user, is_pinned=True,
        )
        second = Announcement.objects.create(
            scope_type=Announcement.ScopeType.COURSE, course_offering=taught_offering,
            title="Second", content="b", created_by=lecturer_user,
        )
        api_client.force_authenticate(user=lecturer_user)
        api_client.post(
            f"/api/v1/announcements/{second.id}/pin/", {"pinned": True}, format="json"
        )
        first.refresh_from_db(); second.refresh_from_db()
        assert second.is_pinned is True
        assert first.is_pinned is False, "two announcements cannot both be pinned"

    def test_pinned_sorts_first(self, taught_offering, lecturer_user, enrolled_student):
        Announcement.objects.create(
            scope_type=Announcement.ScopeType.COURSE, course_offering=taught_offering,
            title="Older pinned", content="a", created_by=lecturer_user,
            is_pinned=True, published_at=timezone.now() - timedelta(days=2),
        )
        Announcement.objects.create(
            scope_type=Announcement.ScopeType.COURSE, course_offering=taught_offering,
            title="Newer normal", content="b", created_by=lecturer_user,
            published_at=timezone.now(),
        )
        titles = [
            a.title for a in Announcement.objects.filter(
                scope_type=Announcement.ScopeType.COURSE
            )
        ]
        assert titles[0] == "Older pinned"

    def test_client_cannot_pin_on_create(self, api_client, taught_offering, lecturer_user, enrolled_student):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.post(
            "/api/v1/announcements/",
            {
                "scope_type": "COURSE", "course_offering": str(taught_offering.id),
                "title": "Sneaky pin", "content": "x", "is_pinned": True,
            },
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()["data"]["is_pinned"] is False

    def test_client_cannot_pin_via_patch(self, api_client, course_announcement, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.patch(
            f"/api/v1/announcements/{course_announcement.id}/",
            {"is_pinned": True}, format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["is_pinned"] is False

    def test_student_cannot_pin(self, api_client, course_announcement, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/pin/",
            {"pinned": True}, format="json",
        )
        assert resp.status_code == 403

    def test_another_lecturer_cannot_pin(
        self, api_client, course_announcement, lecturer_user
    ):
        intruder = User.objects.create_user(
            email="intruder2@test.edu", password="x",
            first_name="In", last_name="Truder", role="LECTURER",
        )
        api_client.force_authenticate(user=intruder)
        resp = api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/pin/",
            {"pinned": True}, format="json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestReadReceipts:
    def test_student_marks_read_and_count_moves(
        self, api_client, course_announcement, enrolled_student
    ):
        api_client.force_authenticate(user=enrolled_student)
        before = api_client.get("/api/v1/announcements/").json()["data"][0]
        assert before["read_count"] == 0
        assert before["recipient_count"] == 1
        assert before["is_read"] is False

        resp = api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/read/", {}, format="json"
        )
        assert resp.status_code == 200, resp.content
        after = resp.json()["data"]
        assert after["is_read"] is True
        assert after["read_count"] == 1

    def test_marking_read_twice_is_idempotent(
        self, api_client, course_announcement, enrolled_student
    ):
        api_client.force_authenticate(user=enrolled_student)
        for _ in range(3):
            api_client.post(
                f"/api/v1/announcements/{course_announcement.id}/read/", {}, format="json"
            )
        assert AnnouncementRead.objects.filter(
            announcement=course_announcement, user=enrolled_student
        ).count() == 1

    def test_staff_do_not_create_receipts(
        self, api_client, course_announcement, lecturer_user
    ):
        api_client.force_authenticate(user=lecturer_user)
        api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/read/", {}, format="json"
        )
        assert AnnouncementRead.objects.filter(announcement=course_announcement).count() == 0

    def test_non_audience_student_cannot_mark_read(
        self, api_client, course_announcement, student2_user
    ):
        api_client.force_authenticate(user=student2_user)
        resp = api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/read/", {}, format="json"
        )
        assert resp.status_code == 403

    def test_readers_list_is_author_only(
        self, api_client, course_announcement, enrolled_student, lecturer_user
    ):
        api_client.force_authenticate(user=enrolled_student)
        api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/read/", {}, format="json"
        )

        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/announcements/{course_announcement.id}/readers/")
        assert resp.status_code == 200
        body = resp.json()["data"]
        assert body["read_count"] == 1
        assert body["readers"][0]["user_name"] == enrolled_student.get_full_name()
        assert body["readers"][0]["student_number"] == "STU001"

    def test_student_cannot_see_the_reader_list(
        self, api_client, course_announcement, enrolled_student
    ):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/announcements/{course_announcement.id}/readers/")
        assert resp.status_code == 403

    def test_unread_state_counts_what_has_not_been_opened(
        self, api_client, course_announcement, enrolled_student
    ):
        api_client.force_authenticate(user=enrolled_student)
        before = api_client.get("/api/v1/announcements/read-state/").json()["data"]
        assert before["unread"] == 1

        api_client.post(
            f"/api/v1/announcements/{course_announcement.id}/read/", {}, format="json"
        )
        after = api_client.get("/api/v1/announcements/read-state/").json()["data"]
        assert after["unread"] == 0


@pytest.mark.django_db
class TestAudienceScoping:
    def test_student_sees_course_announcement_they_are_enrolled_for(
        self, api_client, course_announcement, enrolled_student
    ):
        api_client.force_authenticate(user=enrolled_student)
        ids = [a["id"] for a in api_client.get("/api/v1/announcements/").json()["data"]]
        assert str(course_announcement.id) in ids

    def test_student_cannot_read_another_courses_announcement(
        self, api_client, course_announcement, student2_user
    ):
        api_client.force_authenticate(user=student2_user)
        resp = api_client.get(f"/api/v1/announcements/{course_announcement.id}/")
        assert resp.status_code == 403

    def test_non_audience_cannot_fetch_by_id_even_though_list_hides_it(
        self, api_client, course_announcement, student2_user
    ):
        """The detail endpoint used to hand out any announcement by id."""
        api_client.force_authenticate(user=student2_user)
        assert api_client.get(
            f"/api/v1/announcements/{course_announcement.id}/"
        ).status_code == 403

    def test_scheduled_announcement_is_hidden_until_published_at(
        self, api_client, taught_offering, lecturer_user, enrolled_student
    ):
        Announcement.objects.create(
            scope_type=Announcement.ScopeType.COURSE, course_offering=taught_offering,
            title="Later today", content="x", created_by=lecturer_user,
            published_at=timezone.now() + timedelta(hours=5),
        )
        api_client.force_authenticate(user=enrolled_student)
        titles = [a["title"] for a in api_client.get("/api/v1/announcements/").json()["data"]]
        assert "Later today" not in titles

    def test_expired_announcement_is_hidden(self, api_client, taught_offering, lecturer_user, enrolled_student):
        Announcement.objects.create(
            scope_type=Announcement.ScopeType.COURSE, course_offering=taught_offering,
            title="Old news", content="x", created_by=lecturer_user,
            published_at=timezone.now() - timedelta(days=30),
            expires_at=timezone.now() - timedelta(days=1),
        )
        api_client.force_authenticate(user=enrolled_student)
        titles = [a["title"] for a in api_client.get("/api/v1/announcements/").json()["data"]]
        assert "Old news" not in titles

    def test_recipient_count_for_a_course_is_the_enrolled_cohort(
        self, api_client, course_announcement, lecturer_user, enrolled_student
    ):
        api_client.force_authenticate(user=lecturer_user)
        body = api_client.get("/api/v1/announcements/").json()["data"][0]
        assert body["recipient_count"] == 1
        assert body["audience_label"].startswith("CSC301")

    def test_lecturer_cannot_pin_someone_elses_faculty_notice(
        self, api_client, faculty_announcement
    ):
        other = User.objects.create_user(
            email="other2@test.edu", password="x",
            first_name="O", last_name="L", role="LECTURER",
        )
        api_client.force_authenticate(user=other)
        resp = api_client.post(
            f"/api/v1/announcements/{faculty_announcement.id}/pin/",
            {"pinned": True}, format="json",
        )
        assert resp.status_code == 403

    def test_author_can_archive_their_own_announcement(
        self, api_client, course_announcement, lecturer_user
    ):
        """Only admins used to be able to remove an announcement."""
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.delete(f"/api/v1/announcements/{course_announcement.id}/")
        assert resp.status_code == 204
        course_announcement.refresh_from_db()
        assert course_announcement.status == Announcement.Status.ARCHIVED

    def test_archiving_unpins(self, api_client, course_announcement, lecturer_user):
        course_announcement.is_pinned = True
        course_announcement.save(update_fields=["is_pinned"])
        api_client.force_authenticate(user=lecturer_user)
        api_client.delete(f"/api/v1/announcements/{course_announcement.id}/")
        course_announcement.refresh_from_db()
        assert course_announcement.is_pinned is False
