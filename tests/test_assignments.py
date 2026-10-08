"""Tests for assignments & submissions (teacher-set submission limits, deadlines,
late policy, return/regrade) with the same enrollment-privacy rules as materials."""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.academics.models import Enrollment
from apps.accounts.models import User
from apps.learning.models import Assignment, AssignmentSubmission, UploadedFile


@pytest.fixture
def media_root(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture
def offering_with_lecturer(offering, lecturer_user):
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])
    return offering


@pytest.fixture
def assignment(db, offering_with_lecturer, lecturer_user):
    return Assignment.objects.create(
        course_offering=offering_with_lecturer,
        created_by=lecturer_user,
        title="Research essay",
        description="Write a 2000-word essay.",
        points_possible=20,
        max_submissions=1,
        allow_late=False,
        due_at=timezone.now() + timezone.timedelta(days=7),
    )


def _upload(client, filename="essay.pdf", content=b"%PDF essay"):
    return client.post("/api/v1/files/", {"file": SimpleUploadedFile(filename, content, content_type="application/pdf")}, format="multipart")


def _submit(client, assignment, file_id=None):
    payload = {"file": file_id} if file_id else {}
    payload["note"] = "Here is my work"
    return client.post(f"/api/v1/assignments/{assignment.id}/submissions/", payload, format="json")


@pytest.mark.django_db
class TestAssignmentAuthoring:
    def test_teaching_lecturer_creates_assignment(self, api_client, media_root, offering_with_lecturer):
        api_client.force_authenticate(user=offering_with_lecturer.lecturer)
        resp = api_client.post(
            f"/api/v1/course-offerings/{offering_with_lecturer.id}/assignments/",
            {"title": "Lab report", "max_submissions": 2, "points_possible": 10, "allow_late": True},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["max_submissions"] == 2

    def test_non_teaching_lecturer_cannot_create(self, api_client, media_root, offering_with_lecturer):
        stranger = User.objects.create_user(email="stranger@test.edu", password="test1234", role="LECTURER")
        api_client.force_authenticate(user=stranger)
        resp = api_client.post(
            f"/api/v1/course-offerings/{offering_with_lecturer.id}/assignments/",
            {"title": "Nope"},
            format="json",
        )
        assert resp.status_code == 403

    def test_enrolled_student_can_list_assignments(self, api_client, media_root, offering_with_lecturer, enrolled_student, assignment):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/course-offerings/{offering_with_lecturer.id}/assignments/")
        assert resp.status_code == 200
        row = resp.json()["data"][0]
        assert row["title"] == "Research essay"
        assert row["my_submission"] is None
        assert row["attempts_used"] == 0


@pytest.mark.django_db
class TestSubmissionPolicy:
    def test_student_submits(self, api_client, media_root, assignment, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        file_id = _upload(api_client).json()["data"]["id"]
        resp = _submit(api_client, assignment, file_id)
        assert resp.status_code == 201
        body = resp.json()["data"]
        assert body["note"] == "Here is my work"
        assert body["file_info"]["id"] == file_id
        assert body["status"] == "SUBMITTED"

    def test_unenrolled_student_cannot_submit(self, api_client, media_root, assignment, lecturer_user):
        stranger = User.objects.create_user(email="s@test.edu", password="test1234", role="STUDENT")
        api_client.force_authenticate(user=stranger)
        resp = _submit(api_client, assignment)
        assert resp.status_code == 403

    def test_lecturer_cannot_submit(self, api_client, media_root, assignment, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = _submit(api_client, assignment)
        assert resp.status_code == 403

    def test_submission_limit_blocks_second_attempt(self, api_client, media_root, assignment, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=enrolled_student)
        assert _submit(api_client, assignment).status_code == 201
        resp = _submit(api_client, assignment)
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "SUBMISSION_LIMIT_REACHED"

    def test_returned_submission_frees_attempt(self, api_client, media_root, assignment, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=enrolled_student)
        first = _submit(api_client, assignment).json()["data"]
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.patch(f"/api/v1/submissions/{first['id']}/", {"status": "RETURNED"}, format="json")
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "RETURNED"
        api_client.force_authenticate(user=enrolled_student)
        assert _submit(api_client, assignment).status_code == 201

    def test_max_submissions_two_allows_two_attempts(self, api_client, media_root, offering_with_lecturer, lecturer_user, enrolled_student):
        assignment = Assignment.objects.create(
            course_offering=offering_with_lecturer, created_by=lecturer_user, title="Draft", max_submissions=2
        )
        api_client.force_authenticate(user=enrolled_student)
        assert _submit(api_client, assignment).status_code == 201
        assert _submit(api_client, assignment).status_code == 201
        resp = _submit(api_client, assignment)
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "SUBMISSION_LIMIT_REACHED"

    def test_zero_max_submissions_is_unlimited(self, api_client, media_root, offering_with_lecturer, lecturer_user, enrolled_student):
        assignment = Assignment.objects.create(
            course_offering=offering_with_lecturer, created_by=lecturer_user, title="Pond", max_submissions=0
        )
        api_client.force_authenticate(user=enrolled_student)
        assert _submit(api_client, assignment).status_code == 201
        assert _submit(api_client, assignment).status_code == 201
        assert _submit(api_client, assignment).status_code == 201

    def test_deadline_blocks_late_without_allowance(self, api_client, media_root, offering_with_lecturer, lecturer_user, enrolled_student):
        assignment = Assignment.objects.create(
            course_offering=offering_with_lecturer, created_by=lecturer_user, title="Sprint", due_at=timezone.now() - timezone.timedelta(hours=1)
        )
        api_client.force_authenticate(user=enrolled_student)
        resp = _submit(api_client, assignment)
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "MISSED_DEADLINE"

    def test_allow_late_marks_is_late(self, api_client, media_root, offering_with_lecturer, lecturer_user, enrolled_student):
        assignment = Assignment.objects.create(
            course_offering=offering_with_lecturer, created_by=lecturer_user, title="Tolerant",
            due_at=timezone.now() - timezone.timedelta(hours=1), allow_late=True,
        )
        api_client.force_authenticate(user=enrolled_student)
        resp = _submit(api_client, assignment)
        assert resp.status_code == 201
        assert resp.json()["data"]["is_late"] is True


@pytest.mark.django_db
class TestGradingAndAccess:
    def test_lecturer_grades_submission(self, api_client, media_root, assignment, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=enrolled_student)
        sub_id = _submit(api_client, assignment).json()["data"]["id"]
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.patch(
            f"/api/v1/submissions/{sub_id}/",
            {"grade": "18.5", "feedback": "Well argued."},
            format="json",
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["status"] == "GRADED"
        assert float(data["grade"]) == 18.5
        assert data["feedback"] == "Well argued."

    def test_non_teaching_lecturer_cannot_grade(self, api_client, media_root, offering_with_lecturer, assignment, enrolled_student):
        stranger = User.objects.create_user(email="x@test.edu", password="test1234", role="LECTURER")
        api_client.force_authenticate(user=enrolled_student)
        sub_id = _submit(api_client, assignment).json()["data"]["id"]
        api_client.force_authenticate(user=stranger)
        resp = api_client.patch(f"/api/v1/submissions/{sub_id}/", {"grade": "10"}, format="json")
        assert resp.status_code == 403

    def test_student_lists_only_own_submissions(self, api_client, media_root, offering_with_lecturer, lecturer_user, enrolled_student, student2_user):
        api_client.force_authenticate(user=lecturer_user)
        assignment = Assignment.objects.create(course_offering=offering_with_lecturer, created_by=lecturer_user, title="Double")
        for student in (enrolled_student, student2_user):
            Enrollment.objects.get_or_create(student=student, course_offering=offering_with_lecturer, defaults={"status": Enrollment.Status.ACTIVE})
            api_client.force_authenticate(user=student)
            _submit(api_client, assignment)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/assignments/{assignment.id}/submissions/")
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

    def test_lecturer_can_download_student_submission_file(self, api_client, media_root, assignment, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=enrolled_student)
        file_id = _upload(api_client, filename="my-essay.pdf").json()["data"]["id"]
        _submit(api_client, assignment, file_id)
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.get(f"/api/v1/files/{file_id}/")
        assert resp.status_code == 200

    def test_student_can_download_assignment_brief(self, api_client, media_root, offering_with_lecturer, assignment, enrolled_student):
        api_client.force_authenticate(user=offering_with_lecturer.lecturer)
        file_id = _upload(api_client, filename="brief.pdf").json()["data"]["id"]
        assignment.attachment_id = file_id
        assignment.save(update_fields=["attachment"])
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/files/{file_id}/")
        assert resp.status_code == 200

    def test_attempts_used_reported_to_student(self, api_client, media_root, assignment, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        _submit(api_client, assignment)
        resp = api_client.get(f"/api/v1/course-offerings/{assignment.course_offering_id}/assignments/")
        row = resp.json()["data"][0]
        assert row["attempts_used"] == 1
        assert row["my_submission"]["status"] == "SUBMITTED"