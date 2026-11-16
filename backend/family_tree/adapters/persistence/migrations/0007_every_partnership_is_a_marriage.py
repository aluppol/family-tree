from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("people", "0006_member_activity")]

    operations = [
        migrations.RunSQL(
            "UPDATE partnership SET kind = 'marriage' WHERE kind <> 'marriage'",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
