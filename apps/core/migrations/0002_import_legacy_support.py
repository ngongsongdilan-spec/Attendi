from django.db import migrations


def import_support_messages(apps, schema_editor):
    AuditLog = apps.get_model("audit", "AuditLog")
    SupportTicket = apps.get_model("core", "SupportTicket")
    database = schema_editor.connection.alias
    logs = AuditLog.objects.using(database).filter(action="SUPPORT_CONTACT")
    for log in logs.iterator():
        metadata = log.metadata or {}
        if "message" not in metadata:
            continue
        ticket, created = SupportTicket.objects.using(database).get_or_create(
            id=log.id,
            defaults={
                "user_id": log.actor_id,
                "subject": str(metadata.get("subject") or "general")[:200],
                "message": str(metadata["message"]),
            },
        )
        if created:
            SupportTicket.objects.using(database).filter(id=ticket.id).update(
                created_at=log.created_at, updated_at=log.created_at,
            )
        log.metadata = {key: value for key, value in metadata.items() if key not in {"subject", "message"}}
        log.resource_id = ticket.id
        log.save(update_fields=["metadata", "resource_id"])


class Migration(migrations.Migration):
    dependencies = [("core", "0001_support"), ("audit", "0001_initial")]
    operations = [migrations.RunPython(import_support_messages, migrations.RunPython.noop)]
