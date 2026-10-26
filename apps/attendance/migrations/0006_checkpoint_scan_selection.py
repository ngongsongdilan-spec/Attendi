from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("attendance", "0005_offline_attendance")]

    operations = [
        migrations.AlterField(
            model_name="attendancecheckpoint",
            name="selection_method",
            field=models.CharField(
                choices=[
                    ("TEACHER", "Selected by teacher"),
                    ("AUTO", "Auto-selected by system"),
                    ("SCAN", "Activated after scanning"),
                ],
                default="TEACHER",
                max_length=10,
            ),
        ),
    ]
