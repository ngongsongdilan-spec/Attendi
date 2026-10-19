from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_add_personal_email_to_student_profile"),
        ("academics", "0007_semester_registration_deadline"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="admin_faculty",
            field=models.ForeignKey(
                to="academics.faculty", null=True, blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="faculty_administrators",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="admin_department",
            field=models.ForeignKey(
                to="academics.department", null=True, blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="department_administrators",
            ),
        ),
    ]
