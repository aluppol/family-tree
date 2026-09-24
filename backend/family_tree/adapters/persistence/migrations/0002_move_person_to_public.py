from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("people", "0001_initial")]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE "people"."people" SET SCHEMA public',
                        "ALTER TABLE public.people RENAME TO person",
                        "DROP SCHEMA people",
                    ],
                    reverse_sql=[
                        "CREATE SCHEMA people",
                        "ALTER TABLE public.person RENAME TO people",
                        "ALTER TABLE public.people SET SCHEMA people",
                    ],
                ),
            ],
            state_operations=[migrations.AlterModelTable(name="person", table="person")],
        ),
    ]
