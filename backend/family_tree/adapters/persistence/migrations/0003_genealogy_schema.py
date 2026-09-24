import django.db.models.deletion
from django.db import migrations, models
from django.db.models.functions import Now


class Migration(migrations.Migration):
    dependencies = [("people", "0002_move_person_to_public")]

    operations = [
        migrations.CreateModel(
            name="FamilyTreeRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("owner_kind", models.CharField(max_length=16)),
                ("owner_key", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(db_default=Now())),
            ],
            options={"db_table": "family_tree"},
        ),
        migrations.RenameModel(old_name="Person", new_name="PersonRecord"),
        migrations.RenameField(model_name="personrecord", old_name="name", new_name="given_names"),
        migrations.RenameField(model_name="personrecord", old_name="family_name", new_name="surname"),
        migrations.AddField(
            model_name="personrecord",
            name="tree",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="+",
                to="people.familytreerecord",
            ),
        ),
        migrations.AddField(
            model_name="personrecord",
            name="sex",
            field=models.CharField(default="unknown", max_length=16),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="personrecord",
            name="birth_date",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="personrecord",
            name="birth_sort_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="personrecord",
            name="birth_place",
            field=models.CharField(blank=True, default="", max_length=200),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="personrecord",
            name="is_deceased",
            field=models.BooleanField(default=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="personrecord",
            name="death_date",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="personrecord",
            name="death_place",
            field=models.CharField(blank=True, default="", max_length=200),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="personrecord",
            name="biography",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="familytreerecord",
            name="home_person",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="people.personrecord",
            ),
        ),
        migrations.AddConstraint(
            model_name="familytreerecord",
            constraint=models.UniqueConstraint(fields=("owner_kind", "owner_key"), name="family_tree_owner_unique"),
        ),
        migrations.AddIndex(
            model_name="familytreerecord",
            index=models.Index(fields=["owner_kind", "created_at"], name="family_tree_kind_created"),
        ),
        migrations.CreateModel(
            name="ParentLinkRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(max_length=16)),
                ("created_at", models.DateTimeField(db_default=Now())),
                (
                    "tree",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="+",
                        to="people.familytreerecord",
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="+",
                        to="people.personrecord",
                    ),
                ),
                (
                    "child",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="+",
                        to="people.personrecord",
                    ),
                ),
            ],
            options={
                "db_table": "parent_link",
                "indexes": [
                    models.Index(fields=["tree", "child"], name="parent_link_tree_child"),
                    models.Index(fields=["tree", "parent"], name="parent_link_tree_parent"),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=("parent", "child"), name="parent_link_unique_pair"),
                    models.CheckConstraint(
                        condition=models.Q(("parent", models.F("child")), _negated=True),
                        name="parent_link_not_self",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="PartnershipRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(max_length=16)),
                ("start_date", models.CharField(blank=True, max_length=64, null=True)),
                ("start_sort_date", models.DateField(blank=True, null=True)),
                ("start_place", models.CharField(blank=True, max_length=200)),
                ("end_reason", models.CharField(blank=True, max_length=16, null=True)),
                ("end_date", models.CharField(blank=True, max_length=64, null=True)),
                ("created_at", models.DateTimeField(db_default=Now())),
                (
                    "tree",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="+",
                        to="people.familytreerecord",
                    ),
                ),
                (
                    "first_partner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="+",
                        to="people.personrecord",
                    ),
                ),
                (
                    "second_partner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="+",
                        to="people.personrecord",
                    ),
                ),
            ],
            options={
                "db_table": "partnership",
                "indexes": [
                    models.Index(fields=["tree", "first_partner"], name="partnership_tree_first"),
                    models.Index(fields=["tree", "second_partner"], name="partnership_tree_second"),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(("first_partner", models.F("second_partner")), _negated=True),
                        name="partnership_not_self",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="PersonPhotoRecord",
            fields=[
                (
                    "person",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        related_name="+",
                        serialize=False,
                        to="people.personrecord",
                    ),
                ),
                ("media_type", models.CharField(max_length=32)),
                ("content", models.BinaryField()),
                ("updated_at", models.DateTimeField(db_default=Now())),
                (
                    "tree",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="+",
                        to="people.familytreerecord",
                    ),
                ),
            ],
            options={
                "db_table": "person_photo",
                "indexes": [models.Index(fields=["tree"], name="person_photo_tree")],
            },
        ),
    ]
