import pytest
from importlib import import_module
from types import SimpleNamespace
from django.apps import apps
from django.db import connection

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.core.models import SupportTicket


@pytest.mark.django_db
def test_support_owner_and_admin_scope(api_client, cs_department, student_user, student2_user):
    other = User.objects.create_user(email="outside@test.edu", password="pass1234", role="STUDENT")
    admin = User.objects.create_user(
        email="care-admin@test.edu", password="pass1234", role="DEPARTMENT_ADMIN",
        admin_department=cs_department,
    )
    api_client.force_authenticate(user=student_user)
    response = api_client.post("/api/v1/support/contact/", {
        "subject": "Attendance", "message": "My attendance is missing.",
    }, format="json")
    assert response.status_code == 201, response.content
    ticket_id = response.json()["data"]["id"]
    assert response.json()["data"]["status"] == "OPEN"
    assert AuditLog.objects.filter(action="SUPPORT_CONTACT", metadata__message__isnull=False).count() == 0

    api_client.force_authenticate(user=student2_user)
    assert api_client.get("/api/v1/support/contact/").json()["data"] == []
    assert api_client.get(f"/api/v1/support/tickets/{ticket_id}/").status_code == 404
    assert api_client.get("/api/v1/admin/support/").status_code == 403

    api_client.force_authenticate(user=admin)
    assert len(api_client.get("/api/v1/admin/support/").json()["data"]) == 1
    reply = api_client.patch(f"/api/v1/admin/support/{ticket_id}/", {
        "status": "IN_PROGRESS", "message": "We are checking the register."
    }, format="json")
    assert reply.status_code == 200, reply.content
    assert len(reply.json()["data"]["replies"]) == 1

    api_client.force_authenticate(user=other)
    assert api_client.get(f"/api/v1/support/tickets/{ticket_id}/").status_code == 404
    api_client.force_authenticate(user=student_user)
    own = api_client.get(f"/api/v1/support/tickets/{ticket_id}/")
    assert own.json()["data"]["replies"][0]["message"] == "We are checking the register."


@pytest.mark.django_db
def test_legacy_support_message_is_imported_and_redacted(student_user):
    log = AuditLog.objects.create(actor=student_user, action="SUPPORT_CONTACT", resource_type="SupportTicket",
                                  metadata={"subject": "Old request", "message": "A private support message"})
    orphan = AuditLog.objects.create(actor=None, action="SUPPORT_CONTACT", resource_type="SupportTicket",
                                     metadata={"subject": "Orphaned request", "message": "Private orphaned message"})
    migration = import_module("apps.core.migrations.0002_import_legacy_support")
    migration.import_support_messages(apps, SimpleNamespace(connection=connection))
    ticket = SupportTicket.objects.get(id=log.id)
    assert ticket.user == student_user
    assert ticket.message == "A private support message"
    log.refresh_from_db()
    assert "message" not in log.metadata and "subject" not in log.metadata
    orphan.refresh_from_db()
    assert SupportTicket.objects.get(id=orphan.id).user is None
    assert "message" not in orphan.metadata and "subject" not in orphan.metadata
