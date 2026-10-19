"""Admin onboarding and academic-unit isolation."""
import pytest

from apps.accounts.models import StudentProfile, User
from apps.academics.models import Course, Department, Faculty


@pytest.fixture
def units(db):
    fet = Faculty.objects.create(code="FET", name="Engineering")
    science = Faculty.objects.create(code="SCI", name="Science")
    cs = Department.objects.create(code="CS", name="Computer Science", faculty=fet)
    ee = Department.objects.create(code="EE", name="Electrical Engineering", faculty=fet)
    math = Department.objects.create(code="MATH", name="Mathematics", faculty=science)
    return fet, science, cs, ee, math


def make_user(email, role, **extra):
    return User.objects.create_user(
        email=email, password="Pass12345!", first_name="Test", last_name="User",
        role=role, **extra,
    )


@pytest.mark.django_db
def test_system_admin_creates_scoped_account_and_can_promote_existing(api_client, units):
    fet, _science, cs, _ee, _math = units
    system = make_user("system@test.edu", User.Role.SYSTEM_ADMIN)
    lecturer = make_user("lecturer@test.edu", User.Role.LECTURER)
    api_client.force_authenticate(user=system)

    missing_scope = api_client.post("/api/v1/admin/accounts/", {
        "email": "missing@test.edu", "first_name": "Faculty", "last_name": "Admin",
        "role": "FACULTY_ADMIN",
    }, format="json")
    assert missing_scope.status_code == 400

    created = api_client.post("/api/v1/admin/accounts/", {
        "email": "faculty@test.edu", "first_name": "Faculty", "last_name": "Admin",
        "role": "FACULTY_ADMIN", "faculty_id": str(fet.id),
    }, format="json")
    assert created.status_code == 201, created.content
    payload = created.json()["data"]
    account = User.objects.get(email="faculty@test.edu")
    assert account.role == User.Role.FACULTY_ADMIN
    assert account.admin_faculty_id == fet.id
    assert account.check_password(payload["temporary_password"])
    assert account.must_change_password
    assert payload["user"]["admin_scope"]["faculty_id"] == str(fet.id)

    assigned = api_client.patch(f"/api/v1/admin/accounts/{lecturer.id}/", {
        "role": "DEPARTMENT_ADMIN", "department_id": str(cs.id),
    }, format="json")
    assert assigned.status_code == 200, assigned.content
    lecturer.refresh_from_db()
    assert lecturer.role == User.Role.DEPARTMENT_ADMIN
    assert lecturer.admin_department_id == cs.id


@pytest.mark.django_db
def test_public_signup_cannot_choose_admin_and_scoped_admin_cannot_promote(api_client, units):
    fet, _science, _cs, _ee, _math = units
    signup = api_client.post("/api/v1/auth/self-register/", {
        "email": "self@test.edu", "password": "Pass12345!", "password_confirm": "Pass12345!",
        "first_name": "Self", "last_name": "Admin", "role": "FACULTY_ADMIN",
    }, format="json")
    assert signup.status_code == 400
    assert not User.objects.filter(email="self@test.edu").exists()

    faculty_admin = make_user("faculty@test.edu", User.Role.FACULTY_ADMIN, admin_faculty=fet)
    target = make_user("target@test.edu", User.Role.LECTURER)
    api_client.force_authenticate(user=faculty_admin)
    result = api_client.patch(f"/api/v1/admin/accounts/{target.id}/", {
        "role": "FACULTY_ADMIN", "faculty_id": str(fet.id),
    }, format="json")
    assert result.status_code == 403
    target.refresh_from_db()
    assert target.role == User.Role.LECTURER


@pytest.mark.django_db
def test_faculty_and_department_admins_only_see_and_manage_their_units(api_client, units):
    fet, _science, cs, ee, math = units
    faculty_admin = make_user("faculty@test.edu", User.Role.FACULTY_ADMIN, admin_faculty=fet)
    dept_admin = make_user("department@test.edu", User.Role.DEPARTMENT_ADMIN, admin_department=cs)
    for email, department in [
        ("cs@test.edu", cs), ("ee@test.edu", ee), ("math@test.edu", math),
    ]:
        student = make_user(email, User.Role.STUDENT)
        StudentProfile.objects.create(user=student, department=department)

    api_client.force_authenticate(user=faculty_admin)
    faculty_users = api_client.get("/api/v1/users/")
    assert faculty_users.status_code == 200
    emails = {row["email"] for row in faculty_users.json()["data"]}
    assert "cs@test.edu" in emails and "ee@test.edu" in emails
    assert "math@test.edu" not in emails
    assert api_client.post("/api/v1/courses/", {
        "department": str(math.id), "code": "MATH101", "title": "Math",
    }, format="json").status_code == 403
    assert api_client.post("/api/v1/courses/", {
        "department": str(ee.id), "code": "EE101", "title": "Circuits",
    }, format="json").status_code == 201
    assert Course.objects.filter(code="EE101").exists()

    api_client.force_authenticate(user=dept_admin)
    department_users = api_client.get("/api/v1/users/")
    emails = {row["email"] for row in department_users.json()["data"]}
    assert "cs@test.edu" in emails
    assert "ee@test.edu" not in emails and "math@test.edu" not in emails
    stats = api_client.get("/api/v1/admin/stats/")
    assert stats.status_code == 200
    assert stats.json()["data"]["total_students"] == 1


@pytest.mark.django_db
def test_admin_without_unit_cannot_sign_in_or_use_admin_api(api_client):
    legacy = make_user("legacy@test.edu", User.Role.FACULTY_ADMIN)
    login = api_client.post("/api/v1/auth/login/", {
        "email": legacy.email, "password": "Pass12345!",
    }, format="json")
    assert login.status_code == 403
    api_client.force_authenticate(user=legacy)
    assert api_client.get("/api/v1/admin/stats/").status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize("role", [User.Role.STUDENT, User.Role.LECTURER])
def test_new_public_user_cannot_access_admin_accounts_or_dashboard_data(api_client, units, role):
    _fet, _science, cs, _ee, _math = units
    email = f"{role.lower()}@test.edu"
    payload = {
        "email": email, "password": "Pass12345!", "password_confirm": "Pass12345!",
        "first_name": "New", "last_name": "User", "role": role,
        "department": str(cs.id),
    }
    if role == User.Role.STUDENT:
        payload.update(matricule="FE25A001", level="200", personal_email="personal@test.edu")
    else:
        payload["staff_number"] = "STF001"
    signup = api_client.post("/api/v1/auth/self-register/", payload, format="json")
    assert signup.status_code == 201, signup.content

    user = User.objects.get(email=email)
    api_client.force_authenticate(user=user)
    assert api_client.get("/api/v1/admin/stats/").status_code == 403
    assert api_client.get("/api/v1/admin/accounts/").status_code == 403
    assert api_client.get("/api/v1/users/").status_code == 403
    assert api_client.post("/api/v1/admin/accounts/", {
        "email": "forged@test.edu", "first_name": "Fake", "last_name": "Admin",
        "role": "FACULTY_ADMIN", "faculty_id": str(cs.faculty_id),
    }, format="json").status_code == 403
    assert not User.objects.filter(email="forged@test.edu").exists()
