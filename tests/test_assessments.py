"""Tests for course-level assessment marks (CA/exam) - Phase 3.

Lecturer creates a sheet, enters marks, publishes it; students see their own
mark on published sheets, can raise a dispute; lecturer resolves it and
exports CSV.
"""
import pytest
from decimal import Decimal

from apps.learning.models import Assessment, AssessmentMark


@pytest.fixture
def teaching_offering(offering, lecturer_user, db):
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])
    return offering


@pytest.fixture
def sheet(api_client, teaching_offering, lecturer_user, enrolled_student):
    # enrolled_student must exist BEFORE the sheet is created so mark seeding
    # has an enrollment to pick up.
    api_client.force_authenticate(user=lecturer_user)
    resp = api_client.post(
        f"/api/v1/course-offerings/{teaching_offering.id}/assessments/",
        {"title": "CA 1", "category": "CA", "maximum_score": "20", "weight": "10"},
        format="json",
    )
    assert resp.status_code == 201, resp.content
    return Assessment.objects.get(id=resp.json()["data"]["id"])


@pytest.mark.django_db
class TestAssessmentAuthoring:
    def test_lecturer_creates_sheet_and_seeds_marks(self, sheet, enrolled_student, teaching_offering):
        assert sheet.status == Assessment.Status.DRAFT
        assert sheet.marks.count() == 1
        assert sheet.marks.filter(student=enrolled_student).exists()

    def test_student_cannot_create_sheet(self, api_client, teaching_offering, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/course-offerings/{teaching_offering.id}/assessments/",
            {"title": "Mine", "maximum_score": "10"},
            format="json",
        )
        assert resp.status_code == 403

    def test_other_lecturer_cannot_create_sheet(self, api_client, teaching_offering, enrolled_student, db):
        from apps.accounts.models import User

        other = User.objects.create_user(
            email="nosy@test.edu", password="test1234",
            first_name="Nosy", last_name="Lecturer", role="LECTURER",
        )
        api_client.force_authenticate(user=other)
        resp = api_client.post(
            f"/api/v1/course-offerings/{teaching_offering.id}/assessments/",
            {"title": "Not mine", "maximum_score": "10"},
            format="json",
        )
        assert resp.status_code == 403

    def test_student_does_not_see_drafts(self, api_client, teaching_offering, enrolled_student, sheet):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/course-offerings/{teaching_offering.id}/assessments/")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_lecturer_bulk_enters_marks(self, api_client, sheet, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.put(
            f"/api/v1/assessments/{sheet.id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "18.5", "comment": "solid"}]},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["data"]["saved"] == 1
        mark = AssessmentMark.objects.get(assessment=sheet, student=enrolled_student)
        assert mark.score == Decimal("18.50")
        assert mark.comment == "solid"

    def test_score_above_maximum_rejected(self, api_client, sheet, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.put(
            f"/api/v1/assessments/{sheet.id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "99"}]},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["errors"]  # reported, not silently stored
        mark = AssessmentMark.objects.get(assessment=sheet, student=enrolled_student)
        assert mark.score is None

    def test_unenrolled_student_mark_rejected(self, api_client, sheet, lecturer_user, student2_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.put(
            f"/api/v1/assessments/{sheet.id}/marks/",
            {"marks": [{"student": str(student2_user.id), "score": "5"}]},
            format="json",
        )
        assert resp.json()["data"]["errors"]


@pytest.mark.django_db
class TestPublishAndDispute:
    def _publish(self, api_client, sheet, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.patch(
            f"/api/v1/assessments/{sheet.id}/", {"status": "PUBLISHED"}, format="json"
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["data"]["status"] == "PUBLISHED"

    def test_publish_sets_timestamp_and_reveals_to_student(
        self, api_client, sheet, teaching_offering, enrolled_student, lecturer_user
    ):
        self._publish(api_client, sheet, lecturer_user)
        sheet.refresh_from_db()
        assert sheet.published_at is not None

        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/course-offerings/{teaching_offering.id}/assessments/")
        assert len(resp.json()["data"]) == 1

    def test_student_sees_only_own_mark(self, api_client, sheet, enrolled_student, lecturer_user, teaching_offering):
        api_client.force_authenticate(user=lecturer_user)
        api_client.put(
            f"/api/v1/assessments/{sheet.id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "17"}]},
            format="json",
        )
        self._publish(api_client, sheet, lecturer_user)

        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/course-offerings/{teaching_offering.id}/assessments/")
        data = resp.json()["data"][0]
        assert data["my_mark"]["score"] == "17.00"
        # A student must not receive the whole class mark list.
        assert "marks" not in data

    def test_student_raises_and_lecturer_resolves_dispute(
        self, api_client, sheet, enrolled_student, lecturer_user
    ):
        self._publish(api_client, sheet, lecturer_user)
        mark = AssessmentMark.objects.get(assessment=sheet, student=enrolled_student)

        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.patch(
            f"/api/v1/assessment-marks/{mark.id}/",
            {"dispute_reason": "My script was graded wrong"},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        mark.refresh_from_db()
        assert mark.dispute_status == AssessmentMark.DisputeStatus.OPEN
        assert mark.dispute_reason == "My script was graded wrong"

        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.patch(
            f"/api/v1/assessment-marks/{mark.id}/",
            {"dispute_response": "Re-checked, mark corrected to 19"},
            format="json",
        )
        assert resp.status_code == 200
        mark.refresh_from_db()
        assert mark.dispute_status == AssessmentMark.DisputeStatus.RESOLVED
        assert "corrected" in mark.dispute_response

    def test_dispute_requires_reason(self, api_client, sheet, enrolled_student, lecturer_user):
        self._publish(api_client, sheet, lecturer_user)
        mark = AssessmentMark.objects.get(assessment=sheet, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.patch(f"/api/v1/assessment-marks/{mark.id}/", {}, format="json")
        assert resp.status_code == 400

    def test_cannot_dispute_unpublished(self, api_client, sheet, enrolled_student):
        mark = AssessmentMark.objects.get(assessment=sheet, student=enrolled_student)
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.patch(
            f"/api/v1/assessment-marks/{mark.id}/", {"dispute_reason": "x"}, format="json"
        )
        assert resp.status_code == 403

    def test_other_student_cannot_dispute_someone_elses_mark(
        self, api_client, sheet, enrolled_student
    ):
        from apps.accounts.models import StudentProfile, User
        from apps.academics.models import Enrollment

        mark = AssessmentMark.objects.get(assessment=sheet, student=enrolled_student)
        other = User.objects.create_user(
            email="nosy2@test.edu", password="test1234",
            first_name="Nosy", last_name="Two", role="STUDENT",
        )
        StudentProfile.objects.create(
            user=other, student_number="NSY2",
            department=sheet.course_offering.department, level="300",
        )
        Enrollment.objects.create(student=other, course_offering=sheet.course_offering)
        api_client.force_authenticate(user=other)
        resp = api_client.patch(
            f"/api/v1/assessment-marks/{mark.id}/", {"dispute_reason": "mine not yours"}, format="json"
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestAssessmentExport:
    def test_lecturer_exports_csv(self, api_client, sheet, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        api_client.put(
            f"/api/v1/assessments/{sheet.id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "12"}]},
            format="json",
        )
        resp = api_client.get(f"/api/v1/assessments/{sheet.id}/export.csv")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "text/csv"
        assert "attachment" in resp["Content-Disposition"]
        body = resp.content.decode()
        assert "student_number" in body
        assert "12" in body

    def test_student_cannot_export(self, api_client, sheet, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get(f"/api/v1/assessments/{sheet.id}/export.csv")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestMyAssessments:
    def test_student_lists_published_assessments_with_marks(
        self, api_client, sheet, enrolled_student, lecturer_user
    ):
        api_client.force_authenticate(user=lecturer_user)
        api_client.put(
            f"/api/v1/assessments/{sheet.id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "15"}]},
            format="json",
        )
        api_client.patch(f"/api/v1/assessments/{sheet.id}/", {"status": "PUBLISHED"}, format="json")

        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.get("/api/v1/students/me/assessments/")
        assert resp.status_code == 200
        data = resp.json()["data"]
        items = data["assessments"]
        assert len(items) == 1
        assert items[0]["my_mark"]["score"] == "15.00"
        # Combined grades travel alongside the individual sheets.
        assert "groups" in data


@pytest.mark.django_db
class TestMarkScaleEntry:
    """A lecturer marks on /20 while the sheet is reported out of 30."""

    def test_marking_scale_is_validated_and_converted(
        self, api_client, teaching_offering, enrolled_student, lecturer_user
    ):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.post(
            f"/api/v1/course-offerings/{teaching_offering.id}/assessments/",
            {"title": "CA 1", "category": "CA", "maximum_score": "30", "raw_maximum": "20"},
            format="json",
        )
        assert resp.status_code == 201
        created = resp.json()["data"]
        assert created["is_converted"] is True
        assert Decimal(str(created["marking_scale_value"])) == Decimal("20")
        sheet_id = created["id"]

        mark = AssessmentMark.objects.get(assessment_id=sheet_id, student=enrolled_student)
        # 16 out of the marking scale of 20 is accepted...
        ok = api_client.put(
            f"/api/v1/assessments/{sheet_id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "16"}]},
            format="json",
        )
        assert ok.json()["data"]["errors"] == []
        # ...but 25 out of 20 is not.
        bad = api_client.put(
            f"/api/v1/assessments/{sheet_id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "25"}]},
            format="json",
        )
        assert bad.json()["data"]["errors"]

        detail = api_client.get(f"/api/v1/assessments/{sheet_id}/").json()["data"]
        assert Decimal(str(detail["marks"][0]["score"])) == Decimal("16")
        assert Decimal(str(detail["marks"][0]["reported_score"])) == Decimal("24")

    def test_student_sees_converted_score(self, api_client, teaching_offering, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.post(
            f"/api/v1/course-offerings/{teaching_offering.id}/assessments/",
            {"title": "CA 1", "category": "CA", "maximum_score": "30", "raw_maximum": "20"},
            format="json",
        )
        sheet_id = resp.json()["data"]["id"]
        api_client.put(
            f"/api/v1/assessments/{sheet_id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "18"}]},
            format="json",
        )
        api_client.patch(f"/api/v1/assessments/{sheet_id}/", {"status": "PUBLISHED"}, format="json")

        api_client.force_authenticate(user=enrolled_student)
        data = api_client.get("/api/v1/students/me/assessments/").json()["data"]
        mine = data["assessments"][0]
        assert Decimal(str(mine["maximum_score"])) == Decimal("30")
        assert Decimal(str(mine["my_mark"]["score"])) == Decimal("18")          # what the lecturer typed
        assert Decimal(str(mine["my_mark"]["reported_score"])) == Decimal("27")  # what the student sees

    def test_csv_includes_both_scales(self, api_client, teaching_offering, enrolled_student, lecturer_user):
        api_client.force_authenticate(user=lecturer_user)
        resp = api_client.post(
            f"/api/v1/course-offerings/{teaching_offering.id}/assessments/",
            {"title": "CA 1", "category": "CA", "maximum_score": "30", "raw_maximum": "20"},
            format="json",
        )
        sheet_id = resp.json()["data"]["id"]
        api_client.put(
            f"/api/v1/assessments/{sheet_id}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "18"}]},
            format="json",
        )
        body = api_client.get(f"/api/v1/assessments/{sheet_id}/export.csv").content.decode()
        assert "raw_score" in body and "reported_score" in body
        assert "18" in body and "27.00" in body


@pytest.mark.django_db
class TestAssessmentGroupAPI:
    def _sheets(self, api_client, offering, lecturer, student):
        """Two CAs on different scales inside one CA out of 30."""
        api_client.force_authenticate(user=lecturer)
        g = api_client.post(
            f"/api/v1/course-offerings/{offering.id}/assessment-groups/",
            {"title": "Continuous Assessment", "maximum_score": "30"},
            format="json",
        )
        assert g.status_code == 201, g.content
        gid = g.json()["data"]["id"]
        ids = []
        for title, maxs, raw in (("CA 1", 30, 20), ("CA 2", 30, 25)):
            r = api_client.post(
                f"/api/v1/course-offerings/{offering.id}/assessments/",
                {"title": title, "category": "CA", "maximum_score": str(maxs),
                 "raw_maximum": str(raw), "group": gid},
                format="json",
            )
            assert r.status_code == 201, r.content
            ids.append(r.json()["data"]["id"])
        return gid, ids

    def test_group_combines_members_into_one_ca(self, api_client, teaching_offering, enrolled_student, lecturer_user):
        gid, ids = self._sheets(api_client, teaching_offering, lecturer_user, enrolled_student)
        # 16/20 and 20/25 are both 80% -> 24/30 each -> 12 of 30 each
        api_client.put(
            f"/api/v1/assessments/{ids[0]}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "16"}]}, format="json")
        api_client.put(
            f"/api/v1/assessments/{ids[1]}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "20"}]}, format="json")

        detail = api_client.get(f"/api/v1/assessment-groups/{gid}/").json()["data"]
        assert detail["member_count"] == 2
        row = detail["students"][0]
        assert Decimal(str(row["total"])) == Decimal("24")
        assert Decimal(str(row["out_of"])) == Decimal("30")
        assert row["graded_members"] == 2

    def test_publishing_group_publishes_combined_grade(self, api_client, teaching_offering, enrolled_student, lecturer_user):
        gid, ids = self._sheets(api_client, teaching_offering, lecturer_user, enrolled_student)
        api_client.put(
            f"/api/v1/assessments/{ids[0]}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "20"}]}, format="json")
        api_client.put(
            f"/api/v1/assessments/{ids[1]}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "25"}]}, format="json")
        assert api_client.patch(f"/api/v1/assessments/{ids[0]}/", {"status": "PUBLISHED"}, format="json").status_code == 200
        assert api_client.patch(f"/api/v1/assessments/{ids[1]}/", {"status": "PUBLISHED"}, format="json").status_code == 200
        api_client.patch(f"/api/v1/assessment-groups/{gid}/", {"status": "PUBLISHED"}, format="json")

        api_client.force_authenticate(user=enrolled_student)
        data = api_client.get("/api/v1/students/me/assessments/").json()["data"]
        assert len(data["groups"]) == 1
        assert Decimal(str(data["groups"][0]["students"][0]["total"])) == Decimal("30")

    def test_student_cannot_create_group(self, api_client, teaching_offering, enrolled_student):
        api_client.force_authenticate(user=enrolled_student)
        resp = api_client.post(
            f"/api/v1/course-offerings/{teaching_offering.id}/assessment-groups/",
            {"title": "Nope", "maximum_score": "30"}, format="json")
        assert resp.status_code == 403

    def test_other_lecturer_cannot_see_draft_group(self, api_client, teaching_offering, lecturer_user, db):
        from apps.accounts.models import User
        gid, _ = self._sheets(api_client, teaching_offering, lecturer_user, None)
        other = User.objects.create_user(
            email="other.lect@test.edu", password="test1234",
            first_name="Other", last_name="Lect", role="LECTURER")
        api_client.force_authenticate(user=other)
        assert api_client.get(f"/api/v1/assessment-groups/{gid}/").status_code == 403

    def test_group_csv_export(self, api_client, teaching_offering, enrolled_student, lecturer_user):
        gid, ids = self._sheets(api_client, teaching_offering, lecturer_user, enrolled_student)
        api_client.put(
            f"/api/v1/assessments/{ids[0]}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "16"}]}, format="json")
        api_client.put(
            f"/api/v1/assessments/{ids[1]}/marks/",
            {"marks": [{"student": str(enrolled_student.id), "score": "20"}]}, format="json")
        resp = api_client.get(f"/api/v1/assessment-groups/{gid}/export.csv")
        assert resp.status_code == 200
        body = resp.content.decode()
        assert "CA 1" in body and "CA 2" in body
        assert "24.00" in body
