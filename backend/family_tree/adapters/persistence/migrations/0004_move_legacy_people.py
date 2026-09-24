from django.db import migrations
from django.db.models import F

MONTH_NAMES = ("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")
LEGACY_OWNER = {"owner_kind": "legacy", "owner_key": "legacy"}


def move_legacy_people(apps, schema_editor):
    person_model = apps.get_model("people", "PersonRecord")
    legacy_people = list(person_model.objects.filter(tree__isnull=True).order_by("id"))
    if not legacy_people:
        return
    tree = apps.get_model("people", "FamilyTreeRecord").objects.create(**LEGACY_OWNER)
    for person in legacy_people:
        adopt_into_tree(person, tree)
    link_model = apps.get_model("people", "ParentLinkRecord")
    link_model.objects.bulk_create(
        link_model(tree=tree, parent_id=parent_id, child_id=child_id, kind="birth")
        for parent_id, child_id in sorted(legacy_parent_pairs(legacy_people))
    )
    mark_parent_sexes(person_model, legacy_people)
    person_model.objects.filter(updated_at__isnull=True).update(updated_at=F("created_at"))


def adopt_into_tree(person, tree):
    birthday = person.birthday.date()
    person.tree = tree
    person.birth_date = f"{birthday.day} {MONTH_NAMES[birthday.month - 1]} {birthday.year}"
    person.birth_sort_date = birthday
    person.save(update_fields=["tree", "birth_date", "birth_sort_date"])


def legacy_parent_pairs(legacy_people):
    return {
        (parent_id, person.id)
        for person in legacy_people
        for parent_id in (person.father_id_id, person.mother_id_id)
        if parent_id is not None and parent_id != person.id
    }


def mark_parent_sexes(person_model, legacy_people):
    fathers = {person.father_id_id for person in legacy_people} - {None}
    mothers = {person.mother_id_id for person in legacy_people} - {None}
    person_model.objects.filter(id__in=fathers - mothers).update(sex="male")
    person_model.objects.filter(id__in=mothers - fathers).update(sex="female")


class Migration(migrations.Migration):
    dependencies = [("people", "0003_genealogy_schema")]

    operations = [migrations.RunPython(move_legacy_people, migrations.RunPython.noop)]
