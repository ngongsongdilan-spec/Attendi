"""Tests for learning materials, file upload/download authorization (FR-050/051/052,
BR-070/071/091/181/182/183) and course-scoped announcements (FR-060/061, BR-083)."""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import User
from apps.announcements.models import Announcement
from apps.learning.models import LearningMaterial, UploadedFile


@pytest.fixture
def media_root(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture
def offering_with_lecturer(offering, lecturer_user):
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])
    return offering


def _upload(client, filename="lecture-1.pdf", content=b"%PDF-1.4 test content", content_type="application/pdf", size_delta=0):
    data = SimpleUploadedFile(filename, content * (1 + size_delta) if size_delta else content, content_type=content_type)
    return client.post("/api/v1/files/", {"file": data}, format="multipart")


@pytest.mark.django_db
class TestFileUpload:
    def test_student_can_upload_file(self, api_client, media_root, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = _upload(api_client)
        assert resp.status_code == 201
        body = resp.json()["data"]
        assert body["original_name"] == "lecture-1.pdf"
        assert body["size_bytes"] == len(b"%PDF-1.4 test content")

    def test_rejects_disallowed_extension(self, api_client, media_root, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = _upload(api_client, filename="virus.exe", content_type="application/octet-stream")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_rejects_oversized_file(self, api_client, media_root, enrolled_student, settings):
        settings.FILE_MAX_SIZE_MB = 0
        settings.FILE_MAX_SIZE_BYTES = 1024
        api_client.force_authenticate(user=enrolled_student)
        resp = _upload(api_client, content=b"x" * 4096)
        assert resp.status_code == 400
        assert "maximum size" in resp.json()["error"]["message"]

    def test_requires_auth(self, api_client, media_root):
        resp = _upload(api_client)
        assert resp.status_code == 401


@pytest.mark.django_db
class TestFileDownloadAuthorization:
    def test_uploader_can_download_own_file(self, api_client, media_root, student_user):
        api_client.force_authenticate(user=student_user)
        upload = _upload(api_client)
        file_id = upload.json()["data"]["id"]
        resp = api_client.get(f"/api/v1/files/{file_id}/")
        assert resp.status_code == 200
        assert resp["Content-Disposition"].find("lecture-1.pdf") != -1

    def test_enrolled_student_can_download_course_file(self, api_client, media_root, offering_with_lecturer, lecturer_user, enrolled_student):
        api_client.force_authenticate(user=lecturer_user)
        upload = _upload(api_client, filename="slides.pdf")
        material = LearningMaterial.objects.create(
            course_offering=offering_with_lecturer,
            uploaded_by=lecturer_user,
            title="Lecture 1",
            file=UploadedFile.objects.get(id=upload.json()["data"]["id"]),
        )
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/files/{material.file_id}/")
        assert resp.status_code == 200

    def test_unenrolled_student_cannot_download(self, api_client, media_root, offering_with_lecturer, lecturer_user, student2_user):
        api_client.force_authenticate(user=lecturer_user)
        upload = _upload(api_client, filename="restricted.pdf")
        material = LearningMaterial.objects.create(
            course_offering=offering_with_lecturer,
            uploaded_by=lecturer_user,
            title="Secret",
            file=UploadedFile.objects.get(id=upload.json()["data"]["id"]),
        )
        api_client.force_authenticate(user=student2_user)
        resp = api_client.get(f"/api/v1/files/{material.file_id}/")
        assert resp.status_code == 403

    def test_teaching_lecturer_can_download(self, api_client, media_root, offering_with_lecturer, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        upload = _upload(api_client, filename="marking-guide.pdf")
        LearningMaterial.objects.create(
            course_offering=offering_with_lecturer, uploaded_by=lecturer_user,
            title="Guide", file=UploadedFile.objects.get(id=upload.json()["data"]["id"]),
        )
        resp = api_client.get(f"/api/v1/files/{upload.json()['data']['id']}/")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestMaterialAuthorization:
    def test_unenrolled_student_cannot_view_metadata(self, api_client, media_root, offering, lecturer_user, student2_user):
        material = LearningMaterial.objects.create(
            course_offering=offering, uploaded_by=lecturer_user, title="Lecture 1"
        )
        api_client.force_authenticate(user=student2_user)
        resp = api_client.get(f"/api/v1/materials/{material.id}/")
        assert resp.status_code == 403

    def test_enrolled_student_and_lecturer_can_view(self, api_client, media_root, offering_with_lecturer, lecturer_user, enrolled_student):
        material = LearningMaterial.objects.create(
            course_offering=offering_with_lecturer, uploaded_by=lecturer_user, title="Lecture 1"
        )
        api_client.force_authenticate(user=enrolled_student)
        assert api_client.get(f"/api/v1/materials/{material.id}/").status_code == 200
        api_client.force_authenticate(user=lecturer_user)
        assert api_client.get(f"/api/v1/materials/{material.id}/").status_code == 200

    def test_lecturer_creates_material_with_uploaded_file(self, api_client, media_root, offering_with_lecturer, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        upload = _upload(api_client)
        file_id = upload.json()["data"]["id"]
        resp = api_client.post(
            f"/api/v1/course-offerings/{offering_with_lecturer.id}/materials/",
            {"title": "Lecture 1 Slides", "description": "Intro", "file": file_id, "visibility": "COURSE"},
            format="json",
        )
        assert resp.status_code == 201
        body = resp.json()["data"]
        assert body["file_info"]["id"] == file_id
        assert body["title"] == "Lecture 1 Slides"

    def test_student_enrolled_can_list_materials(self, api_client, media_root, offering, lecturer_user, enrolled_student):
        LearningMaterial.objects.create(course_offering=offering, uploaded_by=lecturer_user, title="Notes")
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/course-offerings/{offering.id}/materials/")
        assert resp.status_code == 200
        assert resp.json()["data"][0]["title"] == "Notes"


@pytest.mark.django_db
class TestCourseAnnouncements:
    def _make_course_announcement(self, offering, user):
        return Announcement.objects.create(
            created_by=user, scope_type=Announcement.ScopeType.COURSE, course_offering=offering,
            title="Test announcement", content="Hello class",
        )

    def test_enrolled_student_sees_course_announcement(self, api_client, offering_with_lecturer, lecturer_user, enrolled_student):
        self._make_course_announcement(offering_with_lecturer, lecturer_user)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/announcements/?course_offering_id={offering_with_lecturer.id}")
        assert resp.status_code == 200
        assert [a["title"] for a in resp.json()["data"]] == ["Test announcement"]

    def test_course_announcement_hidden_from_other_course_filter(self, api_client, offering_with_lecturer, lecturer_user, enrolled_student):
        self._make_course_announcement(offering_with_lecturer, lecturer_user)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/announcements/?course_offering_id=00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_teaching_lecturer_can_post_course_announcement(self, api_client, offering_with_lecturer, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.post(
            "/api/v1/announcements/",
            {"scope_type": "COURSE", "course_offering": str(offering_with_lecturer.id), "title": "Guest lecture", "content": "Room 204 Friday"},
            format="json",
        )
        assert resp.status_code == 201, resp.json()

    def test_lecturer_cannot_post_for_course_they_do_not_teach(self, api_client, offering_with_lecturer):
        other_lecturer = User.objects.create_user(email="other@test.edu", password="test1234", role="LECTURER")
        api_client.force_authenticate(user=other_lecturer)
        resp = api_client.post(
            "/api/v1/announcements/",
            {"scope_type": "COURSE", "course_offering": str(offering_with_lecturer.id), "title": "Nope", "content": "x"},
            format="json",
        )
        assert resp.status_code == 403