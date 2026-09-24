import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

LEGACY = [("people", "0001_initial")]
LEGACY_ROWS = [
    (1, "Robert", "Darwin", "1766-05-30T00:00:00Z", None, None),
    (2, "Susannah", "Wedgwood", "1765-01-03T00:00:00Z", None, None),
    (3, "Charles", "Darwin", "1809-02-12T00:00:00Z", 1, 2),
    (4, "Loop", "Self", "1900-01-01T00:00:00Z", 4, None),
]


def migrate_to(targets: list[tuple[str, str]]) -> None:
    executor = MigrationExecutor(connection)
    executor.loader.build_graph()
    executor.migrate(targets)


def latest_migrations() -> list[tuple[str, str]]:
    leaves: list[tuple[str, str]] = MigrationExecutor(connection).loader.graph.leaf_nodes("people")
    return leaves


def insert_legacy_people() -> None:
    with connection.cursor() as cursor:
        for row in LEGACY_ROWS:
            cursor.execute(
                'INSERT INTO "people"."people"'
                " (id, name, family_name, birthday, father_id_id, mother_id_id, created_at)"
                " VALUES (%s, %s, %s, %s, %s, %s, now())",
                row,
            )


def fetch(sql: str) -> list[tuple[object, ...]]:
    with connection.cursor() as cursor:
        cursor.execute(sql)
        return list(cursor.fetchall())


@pytest.mark.django_db(transaction=True)
def test_legacy_people_move_into_a_legacy_tree() -> None:
    migrate_to(LEGACY)
    insert_legacy_people()
    migrate_to(latest_migrations())
    assert fetch("SELECT owner_kind, owner_key FROM family_tree") == [("legacy", "legacy")]
    people = fetch(
        "SELECT id, given_names, surname, sex, birth_date, birth_sort_date::text FROM person ORDER BY id"
    )
    assert people == [
        (1, "Robert", "Darwin", "male", "30 MAY 1766", "1766-05-30"),
        (2, "Susannah", "Wedgwood", "female", "3 JAN 1765", "1765-01-03"),
        (3, "Charles", "Darwin", "unknown", "12 FEB 1809", "1809-02-12"),
        (4, "Loop", "Self", "male", "1 JAN 1900", "1900-01-01"),
    ]
    assert fetch("SELECT parent_id, child_id, kind FROM parent_link ORDER BY parent_id") == [
        (1, 3, "birth"),
        (2, 3, "birth"),
    ]
    assert fetch("SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'people'") == [(0,)]
