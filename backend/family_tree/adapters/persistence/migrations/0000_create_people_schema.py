from django.db import migrations


class Migration(migrations.Migration):
    run_before = [("people", "0001_initial")]

    operations = [
        migrations.RunSQL(
            sql="CREATE SCHEMA IF NOT EXISTS people",
            reverse_sql="DROP SCHEMA IF EXISTS people",
        ),
    ]
