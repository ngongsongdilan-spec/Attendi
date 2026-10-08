"""End-to-end lecturer and student workflow for one course offering."""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

@pytest.fixture
def workflow_media_root(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.mark.django_db
def test_lecturer_student_course_workflow(
    api_client,
    academic_period,
    course,
    offering,
    lecturer_user,
    student_user,
    workflow_media_root,
):
    academic_period.is_active = True
    academic_period.save(update_fields=["is_active"])
    course.level = "300"
    course.save(update_fields=["level"])
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])
    profile = student_user.student_profile
    profile.level = "300"
    profile.save(update_fields=["level"])

    api_client.force_authenticate(user=student_user)
    registration = api_client.post(
        "/api/v1/students/me/register/",
        {"offering_ids": [str(offering.id)]},
        format="json",
    )
    assert registration.status_code == 201, registration.content
    assert registration.json()["data"]["registered_count"] == 1

    api_client.force_authenticate(user=lecturer_user)
    teaching_courses = api_client.get("/api/v1/lecturers/me/courses/")
    assert teaching_courses.status_code == 200
    assert str(teaching_courses.json()["data"][0]["offering_id"]) == str(offering.id)

    roster = api_client.get(f"/api/v1/course-offerings/{offering.id}/enrollments/")
    assert roster.status_code == 200
    assert any(row["student"] == str(student_user.id) for row in roster.json()["data"])

    announcement = api_client.post(
        "/api/v1/announcements/",
        {
            "scope_type": "COURSE",
            "course_offering": str(offering.id),
            "title": "Week 1 update",
            "content": "Lecture slides are available.",
        },
        format="json",
    )
    assert announcement.status_code == 201, announcement.content

    upload = api_client.post(
        "/api/v1/files/",
        {"file": SimpleUploadedFile("lecture.pdf", b"%PDF-1.4 lecture", content_type="application/pdf")},
        format="multipart",
    )
    assert upload.status_code == 201, upload.content
    file_id = upload.json()["data"]["id"]
    material = api_client.post(
        f"/api/v1/course-offerings/{offering.id}/materials/",
        {"title": "Week 1 Lecture", "description": "Introduction", "file": file_id, "visibility": "COURSE"},
        format="json",
    )
    assert material.status_code == 201, material.content

    api_client.force_authenticate(user=student_user)
    announcements = api_client.get(f"/api/v1/announcements/?course_offering_id={offering.id}")
    assert announcements.status_code == 200
    assert announcements.json()["data"][0]["title"] == "Week 1 update"

    materials = api_client.get(f"/api/v1/course-offerings/{offering.id}/materials/")
    assert materials.status_code == 200
    assert materials.json()["data"][0]["title"] == "Week 1 Lecture"
    assert api_client.get(f"/api/v1/files/{file_id}/").status_code == 200

    api_client.force_authenticate(user=lecturer_user)
    assignment = api_client.post(
        f"/api/v1/course-offerings/{offering.id}/assignments/",
        {"title": "Lab 1", "description": "Complete the lab", "points_possible": 20},
        format="json",
    )
    assert assignment.status_code == 201, assignment.content
    assignment_id = assignment.json()["data"]["id"]

    api_client.force_authenticate(user=student_user)
    assignment_list = api_client.get(f"/api/v1/course-offerings/{offering.id}/assignments/")
    assert assignment_list.status_code == 200
    assert assignment_list.json()["data"][0]["title"] == "Lab 1"
    submission = api_client.post(
        f"/api/v1/assignments/{assignment_id}/submissions/",
        {"note": "My completed lab"},
        format="json",
    )
    assert submission.status_code == 201, submission.content

    api_client.force_authenticate(user=lecturer_user)
    grade = api_client.patch(
        f"/api/v1/submissions/{submission.json()['data']['id']}/",
        {"grade": "18", "feedback": "Good work"},
        format="json",
    )
    assert grade.status_code == 200, grade.content
    assert grade.json()["data"]["status"] == "GRADED"

    assessment = api_client.post(
        f"/api/v1/course-offerings/{offering.id}/assessments/",
        {"title": "CA 1", "category": "CA", "maximum_score": "20", "weight": "10"},
        format="json",
    )
    assert assessment.status_code == 201, assessment.content
    assessment_id = assessment.json()["data"]["id"]
    marks = api_client.put(
        f"/api/v1/assessments/{assessment_id}/marks/",
        {"marks": [{"student": str(student_user.id), "score": "17"}]},
        format="json",
    )
    assert marks.status_code == 200, marks.content
    assert marks.json()["data"]["saved"] == 1
    published = api_client.patch(
        f"/api/v1/assessments/{assessment_id}/",
        {"status": "PUBLISHED"},
        format="json",
    )
    assert published.status_code == 200, published.content

    api_client.force_authenticate(user=student_user)
    assessments = api_client.get(f"/api/v1/course-offerings/{offering.id}/assessments/")
    assert assessments.status_code == 200
    student_assessment = assessments.json()["data"][0]
    assert student_assessment["status"] == "PUBLISHED"
    assert student_assessment["my_mark"]["score"] == "17.00"