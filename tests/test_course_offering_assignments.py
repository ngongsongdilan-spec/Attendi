"""Admin assignment of teaching lecturers to existing course offerings."""
import pytest

from apps.accounts.models import User


@pytest.fixture
def system_admin(db):
    return User.objects.create_user(
        email="offering.admin@test.edu",
        password="test1234",
        role="SYSTEM_ADMIN",
        is_staff=True,
    )


@pytest.mark.django_db
def test_admin_assigns_lecturer_to_existing_offering(api_client, offering, system_admin, lecturer_user):
    api_client.force_authenticate(user=system_admin)

    response = api_client.patch(
        f"/api/v1/course-offerings/{offering.id}/",
        {"lecturer": str(lecturer_user.id)},
        format="json",
    )

    assert response.status_code == 200, response.content
    assert response.json()["data"]["lecturer"] == str(lecturer_user.id)
    assert response.json()["data"]["department_name"] == offering.department.name


@pytest.mark.django_db
def test_lecturer_cannot_reassign_offering(api_client, offering, lecturer_user, student_user):
    api_client.force_authenticate(user=lecturer_user)

    response = api_client.patch(
        f"/api/v1/course-offerings/{offering.id}/",
        {"lecturer": str(student_user.id)},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_can_unassign_lecturer(api_client, offering, lecturer_user, system_admin):
    offering.lecturer = lecturer_user
    offering.save(update_fields=["lecturer"])
    api_client.force_authenticate(user=system_admin)

    response = api_client.patch(
        f"/api/v1/course-offerings/{offering.id}/",
        {"lecturer": None},
        format="json",
    )

    assert response.status_code == 200, response.content
    assert response.json()["data"]["lecturer"] is None
