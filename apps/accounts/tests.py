from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User


class AccountsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            "student@example.test",
            "student",
            "Stu",
            "Dent",
            "StrongPass!2026",
        )
        self.admin = User.objects.create_user(
            "admin@example.test",
            "admin",
            "Ad",
            "Min",
            "StrongPass!2026",
            role=User.Role.ADMINISTRATOR,
        )

    def test_registration_defaults_to_student_and_rejects_duplicate_email(self):
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "new@example.test",
                "username": "new-user",
                "first_name": "New",
                "last_name": "User",
                "password": "StrongPass!2026",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["role"], User.Role.STUDENT)

        duplicate = self.client.post(
            reverse("accounts:register"),
            {
                "email": "new@example.test",
                "username": "another-user",
                "first_name": "New",
                "last_name": "User",
                "password": "StrongPass!2026",
            },
            format="json",
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(duplicate.data["error"]["code"], "DUPLICATE_ACCOUNT")

    def test_invalid_login_is_rejected(self):
        response = self.client.post(
            reverse("accounts:login"),
            {"email": self.student.email, "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"]["code"], "INVALID_CREDENTIALS")

    def test_non_admin_cannot_change_role(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            reverse("accounts:change-role"),
            {"user_id": str(self.student.id), "new_role": User.Role.LECTURER},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, User.Role.STUDENT)

    def test_admin_can_change_another_users_role(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse("accounts:change-role"),
            {"user_id": str(self.student.id), "new_role": User.Role.LECTURER},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, User.Role.LECTURER)
