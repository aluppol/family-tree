from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("people", "0005_drop_legacy_columns")]

    operations = [
        migrations.AddField(
            model_name="familytreerecord",
            name="last_active_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="familytreerecord",
            name="was_seen_as_administrator",
            field=models.BooleanField(db_default=False),
        ),
    ]
