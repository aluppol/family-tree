import secrets
from concurrent.futures import ThreadPoolExecutor, wait

import pytest
from django.db import DatabaseError, connections, transaction

from family_tree.adapters.persistence.meter import PostgresWorkspaceMeter
from family_tree.adapters.persistence.people import DjangoPersonRepository
from family_tree.adapters.persistence.photos import DjangoPhotoStore
from family_tree.adapters.persistence.relationships import (
    DjangoParentLinkRepository,
    DjangoPartnershipRepository,
)
from family_tree.adapters.persistence.trees import DjangoFamilyTreeRepository
from family_tree.domain.allowances import GUEST_ALLOWANCE
from family_tree.domain.dates import CalendarDate, GenealogicalDate
from family_tree.domain.enums import (
    DateQualifier,
    OwnerKind,
    ParentLinkKind,
    PartnershipKind,
    Sex,
    UsageMeasure,
)
from family_tree.domain.errors import NotFound
from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.people import MAX_NAME_LENGTH, MAX_PLACE_LENGTH, LifeEvent, Person, PersonProfile
from family_tree.domain.photos import photo_from_bytes
from family_tree.domain.relationships import PartnershipTerms
from family_tree.domain.services.workspaces import MAX_GUEST_WORKSPACES
from family_tree.domain.workspaces import WorkspaceOwner
from tests.api.builders import random_jpeg
from tests.concurrency import STILL_WAITING_SECONDS, WAIT_SECONDS, held_open, run_and_commit

DATABASE = "default"
PHOTO_BYTES = 200_000
PHOTO_SIZE_OVERHEAD = 16
BIOGRAPHY_RANDOM_BYTES = 7_000
GUEST_DISK_BUDGET = 2 * 1024 * 1024 * 1024
TABLES = ("family_tree", "person", "parent_link", "partnership", "person_photo")
FOUR_BYTE_CHARACTERS = range(0x20000, 0x2A6DF)
BETWEEN_YEARS = GenealogicalDate(
    DateQualifier.BETWEEN, CalendarDate(1800, 12, 31), CalendarDate(1899, 12, 31)
)


@pytest.mark.django_db
def test_counts_the_people_and_relationships_of_one_tree_only() -> None:
    measured, other = new_tree("measured"), new_tree("other")
    first, second = DjangoPersonRepository(DATABASE).add_many(measured, [profile(), profile()])
    DjangoPersonRepository(DATABASE).add(other, profile())
    DjangoParentLinkRepository(DATABASE).add(measured, first.id, second.id, ParentLinkKind.BIRTH)
    terms = PartnershipTerms(kind=PartnershipKind.MARRIAGE, start=LifeEvent())
    DjangoPartnershipRepository(DATABASE).add(measured, (first.id, second.id), terms)
    measures = (UsageMeasure.PEOPLE, UsageMeasure.RELATIONSHIPS)
    assert [usage(tree, measure) for tree in (measured, other) for measure in measures] == [2, 2, 1, 0]


@pytest.mark.django_db
def test_stored_bytes_grow_by_the_size_of_a_photo() -> None:
    tree = new_tree("photographed")
    assert usage(tree, UsageMeasure.STORED_BYTES) == 0
    person = DjangoPersonRepository(DATABASE).add(tree, profile())
    before = usage(tree, UsageMeasure.STORED_BYTES)
    DjangoPhotoStore(DATABASE).save(tree, person.id, photo_from_bytes(random_jpeg(PHOTO_BYTES)))
    growth = usage(tree, UsageMeasure.STORED_BYTES) - before
    assert PHOTO_BYTES <= growth <= PHOTO_BYTES + PHOTO_SIZE_OVERHEAD


@pytest.mark.django_db
def test_a_biography_counts_towards_stored_bytes() -> None:
    plain, storied = new_tree("plain"), new_tree("storied")
    DjangoPersonRepository(DATABASE).add(plain, profile())
    DjangoPersonRepository(DATABASE).add(
        storied, profile(biography=secrets.token_urlsafe(BIOGRAPHY_RANDOM_BYTES))
    )
    growth = usage(storied, UsageMeasure.STORED_BYTES) - usage(plain, UsageMeasure.STORED_BYTES)
    assert growth > BIOGRAPHY_RANDOM_BYTES


@pytest.mark.django_db(transaction=True)
def test_a_locked_tree_stays_locked_until_its_unit_of_work_ends() -> None:
    tree = new_tree("locked")
    with held_open(lambda: DjangoFamilyTreeRepository(DATABASE).lock(tree)):
        assert can_lock_promptly(tree) is False
    assert can_lock_promptly(tree) is True


@pytest.mark.django_db(transaction=True)
def test_locking_does_not_wait_for_another_writer_checking_its_rows_belong_to_the_tree() -> None:
    tree = new_tree("busy")
    with held_open(lambda: add_a_person_and_check_its_tree(tree)):
        assert can_lock_promptly(tree) is True


@pytest.mark.django_db
def test_locking_a_tree_that_was_removed_answers_not_found() -> None:
    trees = DjangoFamilyTreeRepository(DATABASE)
    tree = new_tree("removed")
    trees.delete_guest_workspaces()
    with pytest.raises(NotFound, match="reload the page"):
        trees.lock(tree)


@pytest.mark.django_db(transaction=True)
def test_making_room_for_new_guests_skips_a_sandbox_that_is_being_changed() -> None:
    trees = DjangoFamilyTreeRepository(DATABASE)
    busy, idle = new_tree("busy"), new_tree("idle")
    with held_open(lambda: trees.lock(busy)), transaction.atomic(using=DATABASE):
        set_lock_timeout()
        trees.delete_oldest_guest_workspaces(keep=0)
    assert [can_lock_promptly(tree) for tree in (busy, idle)] == [True, False]


@pytest.mark.django_db(transaction=True)
def test_the_nightly_reset_waits_for_a_change_in_progress_and_removes_it_too() -> None:
    trees, tree = DjangoFamilyTreeRepository(DATABASE), new_tree("changing")
    with ThreadPoolExecutor(max_workers=1) as resets:
        with held_open(lambda: lock_and_add_a_person(tree)):
            reset = resets.submit(run_and_commit, trees.delete_guest_workspaces)
            assert not wait([reset], timeout=STILL_WAITING_SECONDS).done
        reset.result(timeout=WAIT_SECONDS)
    assert (
        trees.find_by_owner(WorkspaceOwner(OwnerKind.GUEST, "changing")),
        usage(tree, UsageMeasure.PEOPLE),
    ) == (
        None,
        0,
    )


@pytest.mark.django_db(transaction=True)
def test_five_hundred_sandboxes_filled_to_every_limit_stay_within_the_disk_budget() -> None:
    truncate_tables()
    empty = disk_bytes()
    tree = new_tree("filled")
    people = DjangoPersonRepository(DATABASE).add_many(
        tree, [widest_profile() for _ in range(peak(UsageMeasure.PEOPLE))]
    )
    DjangoParentLinkRepository(DATABASE).add_many(tree, densest_links(people))
    room = peak(UsageMeasure.STORED_BYTES) - usage(tree, UsageMeasure.STORED_BYTES) - PHOTO_SIZE_OVERHEAD
    DjangoPhotoStore(DATABASE).save(tree, people[0].id, photo_from_bytes(random_jpeg(room)))
    assert [usage(tree, measure) for measure in UsageMeasure] == [
        peak(UsageMeasure.PEOPLE),
        peak(UsageMeasure.RELATIONSHIPS),
        pytest.approx(peak(UsageMeasure.STORED_BYTES), abs=PHOTO_SIZE_OVERHEAD),
    ]
    assert MAX_GUEST_WORKSPACES * (disk_bytes() - empty) <= GUEST_DISK_BUDGET


def profile(biography: str = "") -> PersonProfile:
    return PersonProfile(
        given_names="Ada", surname="Meter", sex=Sex.FEMALE, birth=LifeEvent(), death=None, biography=biography
    )


def widest_profile() -> PersonProfile:
    return PersonProfile(
        given_names=random_text(MAX_NAME_LENGTH),
        surname=random_text(MAX_NAME_LENGTH),
        sex=Sex.UNKNOWN,
        birth=LifeEvent(date=BETWEEN_YEARS, place=random_text(MAX_PLACE_LENGTH)),
        death=LifeEvent(date=BETWEEN_YEARS, place=random_text(MAX_PLACE_LENGTH)),
        biography="",
    )


def random_text(length: int) -> str:
    choices = len(FOUR_BYTE_CHARACTERS)
    return "".join(chr(FOUR_BYTE_CHARACTERS[secrets.randbelow(choices)]) for _ in range(length))


def densest_links(people: list[Person]) -> list[tuple[PersonId, PersonId, ParentLinkKind]]:
    per_person = peak(UsageMeasure.RELATIONSHIPS) // len(people)
    return [
        (person.id, people[(index + step) % len(people)].id, ParentLinkKind.ADOPTED)
        for index, person in enumerate(people)
        for step in range(1, per_person + 1)
    ]


def peak(measure: UsageMeasure) -> int:
    return GUEST_ALLOWANCE.ceilings[measure]


def new_tree(key: str) -> TreeId:
    return DjangoFamilyTreeRepository(DATABASE).add(WorkspaceOwner(OwnerKind.GUEST, key)).id


def usage(tree_id: TreeId, measure: UsageMeasure) -> int:
    return PostgresWorkspaceMeter(DATABASE).usage(tree_id, measure)


def lock_and_add_a_person(tree_id: TreeId) -> None:
    DjangoFamilyTreeRepository(DATABASE).lock(tree_id)
    DjangoPersonRepository(DATABASE).add(tree_id, profile())


def add_a_person_and_check_its_tree(tree_id: TreeId) -> None:
    DjangoPersonRepository(DATABASE).add(tree_id, profile())
    with connections[DATABASE].cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")


def can_lock_promptly(tree_id: TreeId) -> bool:
    try:
        with transaction.atomic(using=DATABASE):
            set_lock_timeout()
            DjangoFamilyTreeRepository(DATABASE).lock(tree_id)
    except (DatabaseError, NotFound):
        return False
    return True


def set_lock_timeout() -> None:
    with connections[DATABASE].cursor() as cursor:
        cursor.execute("SET LOCAL lock_timeout = '500ms'")


def truncate_tables() -> None:
    with connections[DATABASE].cursor() as cursor:
        cursor.execute(f"TRUNCATE {', '.join(TABLES)}")


def disk_bytes() -> int:
    with connections[DATABASE].cursor() as cursor:
        cursor.execute(
            "SELECT sum(pg_total_relation_size(name::regclass)) FROM unnest(%s::text[]) AS name",
            [list(TABLES)],
        )
        [(total,)] = cursor.fetchall()
    return int(total)
