import django.db.models.deletion
from django.db import migrations, models
from django.db.models.functions import Now


class Migration(migrations.Migration):
    dependencies = [("people", "0004_move_legacy_people")]

    operations = [
        migrations.RemoveField(model_name="personrecord", name="birthday"),
        migrations.RemoveField(model_name="personrecord", name="father_id"),
        migrations.RemoveField(model_name="personrecord", name="mother_id"),
        migrations.RemoveField(model_name="personrecord", name="deleted_at"),
        migrations.RemoveField(model_name="personrecord", name="deleted_by"),
        migrations.RemoveField(model_name="personrecord", name="created_by"),
        migrations.RemoveField(model_name="personrecord", name="updated_by"),
        migrations.AlterField(
            model_name="personrecord",
            name="tree",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="+",
                to="people.familytreerecord",
            ),
        ),
        migrations.AlterField(
            model_name="personrecord",
            name="given_names",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AlterField(
            model_name="personrecord",
            name="surname",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AlterField(
            model_name="personrecord",
            name="created_at",
            field=models.DateTimeField(db_default=Now()),
        ),
        migrations.AlterField(
            model_name="personrecord",
            name="updated_at",
            field=models.DateTimeField(db_default=Now()),
        ),
        migrations.AddIndex(
            model_name="personrecord",
            index=models.Index(fields=["tree", "surname", "given_names", "id"], name="person_tree_name"),
        ),
    ]
