from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0004_attendancesession_expected_headcount_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancesession",
            name="effective_end_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="offline_idempotency_key",
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="capture_slot_index",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="capture_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="sync_batch_id",
            field=models.UUIDField(blank=True, null=True),
        ),
    ]
