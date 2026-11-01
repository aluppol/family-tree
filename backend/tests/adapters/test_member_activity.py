from concurrent.futures import ThreadPoolExecutor, wait
from datetime import datetime, timedelta

import pytest
from django.db import connections

from family_tree.adapters.persistence.members import DjangoMemberActivityRepository
from family_tree.adapters.persistence.meter import PostgresWorkspaceMeter
from family_tree.adapters.persistence.models import FamilyTreeRecord
from family_tree.adapters.persistence.people import DjangoPersonRepository
from family_tree.adapters.persistence.photos import DjangoPhotoStore
from family_tree.adapters.persistence.relationships import DjangoParentLinkRepository
from family_tree.adapters.persistence.trees import DjangoFamilyTreeRepository
from family_tree.domain.enums import OwnerKind, ParentLinkKind, Sex, UsageMeasure
from family_tree.domain.identifiers import TreeId
from family_tree.domain.members import InactivityPeriod, MemberActivity
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.photos import photo_from_bytes
from family_tree.domain.workspaces import WorkspaceOwner
from tests.api.builders import random_jpeg
from tests.concurrency import STILL_WAITING_SECONDS, WAIT_SECONDS, held_open, run_and_commit

DATABASE = "default"
MONTH = InactivityPeriod(30)
A_DAY = timedelta(days=1)
A_MINUTE = timedelta(minutes=1)
LONG_AGO = timedelta(days=31)
PHOTO_BYTES = 1_000
LANDSCAPE_MEMBERS = ("long gone", "a month gone", "not quite a month", "recent", "albert", "untracked")


def member(key: str) -> WorkspaceOwner:
    return WorkspaceOwner(OwnerKind.MEMBER, key)


@pytest.mark.django_db
def test_a_first_activity_stamps_the_tree_with_the_database_clock() -> None:
    tree = new_tree(member("ann"))
    before = database_clock()
    activity().record_activity(member("ann"))
    last_active_at, was_seen_as_administrator = activity_of(tree)
    assert (before <= last_active_at <= database_clock(), was_seen_as_administrator) == (True, False)


@pytest.mark.django_db
def test_activity_is_written_at_most_once_a_day() -> None:
    tree = new_tree(member("ann"))
    activity().record_activity(member("ann"))
    first = activity_of(tree)
    activity().record_activity(member("ann"))
    assert activity_of(tree) == first
    yesterday = set_last_active(tree, database_clock() - A_DAY)
    activity().record_activity(member("ann"))
    assert activity_of(tree)[0] >= start_of_today() > yesterday


@pytest.mark.django_db
def test_activity_already_recorded_since_midnight_is_kept() -> None:
    tree = new_tree(member("ann"))
    midnight = set_last_active(tree, start_of_today())
    activity().record_activity(member("ann"))
    assert activity_of(tree) == (midnight, False)


@pytest.mark.django_db
def test_an_administrator_is_marked_and_stays_marked() -> None:
    tree = new_tree(member("albert"))
    activity().record_administrator_activity(member("albert"))
    assert activity_of(tree)[1] is True
    set_last_active(tree, database_clock() - A_DAY)
    activity().record_activity(member("albert"))
    assert activity_of(tree)[1] is True


@pytest.mark.django_db
def test_an_administrator_already_active_today_is_marked_at_once() -> None:
    tree = new_tree(member("promoted"))
    activity().record_activity(member("promoted"))
    activity().record_administrator_activity(member("promoted"))
    assert activity_of(tree)[1] is True


@pytest.mark.django_db
def test_recording_activity_touches_only_the_owners_tree() -> None:
    trees = [
        new_tree(owner) for owner in (member("ann"), member("bob"), WorkspaceOwner(OwnerKind.GUEST, "ann"))
    ]
    activity().record_administrator_activity(member("ann"))
    assert [last_active_at_of(tree) is None for tree in trees] == [False, True, True]


@pytest.mark.django_db
def test_only_members_long_inactive_and_never_seen_as_administrators_are_listed() -> None:
    long_inactive = inactive_landscape()
    assert activity().inactive_members(MONTH) == [
        MemberActivity(subject=subject, last_active_at=moment) for subject, moment in long_inactive.items()
    ]
    assert activity().count_members() == len(LANDSCAPE_MEMBERS)


@pytest.mark.django_db
def test_removing_inactive_members_removes_their_trees_with_everything_in_them() -> None:
    long_inactive = inactive_landscape()
    gone = [existing_tree_of(member(subject)) for subject in long_inactive]
    for tree in gone:
        fill(tree)
    activity().delete_inactive_members(MONTH)
    assert [tree_of(member(subject)) for subject in long_inactive] == [None, None]
    assert [usage(tree, measure) for tree in gone for measure in UsageMeasure] == [0] * 6
    assert activity().inactive_members(MONTH) == []
    assert activity().count_members() == len(LANDSCAPE_MEMBERS) - len(long_inactive)


@pytest.mark.django_db(transaction=True)
def test_removal_waits_for_a_change_in_progress_and_removes_that_tree_too() -> None:
    tree = new_tree(member("busy"))
    set_last_active(tree, database_clock() - LONG_AGO)
    with ThreadPoolExecutor(max_workers=1) as removals:
        with held_open(lambda: lock_and_fill(tree)):
            removal = removals.submit(run_and_commit, lambda: activity().delete_inactive_members(MONTH))
            assert not wait([removal], timeout=STILL_WAITING_SECONDS).done
        removal.result(timeout=WAIT_SECONDS)
    assert (tree_of(member("busy")), usage(tree, UsageMeasure.PEOPLE)) == (None, 0)


@pytest.mark.django_db(transaction=True)
def test_a_member_who_returns_while_the_removal_waits_keeps_the_tree() -> None:
    tree = new_tree(member("returning"))
    set_last_active(tree, database_clock() - LONG_AGO)
    with ThreadPoolExecutor(max_workers=1) as removals:
        with held_open(lambda: activity().record_activity(member("returning"))):
            removal = removals.submit(run_and_commit, lambda: activity().delete_inactive_members(MONTH))
            assert not wait([removal], timeout=STILL_WAITING_SECONDS).done
        removal.result(timeout=WAIT_SECONDS)
    assert tree_of(member("returning")) == tree


def inactive_landscape() -> dict[str, datetime]:
    now = database_clock()
    long_gone = set_last_active(new_tree(member("long gone")), now - LONG_AGO)
    a_month_gone = set_last_active(new_tree(member("a month gone")), now - timedelta(days=30))
    set_last_active(new_tree(member("not quite a month")), now - timedelta(days=30) + A_MINUTE)
    set_last_active(new_tree(member("recent")), now - A_DAY)
    administrator = new_tree(member("albert"))
    activity().record_administrator_activity(member("albert"))
    set_last_active(administrator, now - LONG_AGO)
    new_tree(member("untracked"))
    set_last_active(new_tree(WorkspaceOwner(OwnerKind.GUEST, "long gone")), now - LONG_AGO)
    return {"long gone": long_gone, "a month gone": a_month_gone}


def activity() -> DjangoMemberActivityRepository:
    return DjangoMemberActivityRepository(DATABASE)


def new_tree(owner: WorkspaceOwner) -> TreeId:
    return DjangoFamilyTreeRepository(DATABASE).add(owner).id


def tree_of(owner: WorkspaceOwner) -> TreeId | None:
    tree = DjangoFamilyTreeRepository(DATABASE).find_by_owner(owner)
    return None if tree is None else tree.id


def existing_tree_of(owner: WorkspaceOwner) -> TreeId:
    tree_id = tree_of(owner)
    assert tree_id is not None
    return tree_id


def last_active_at_of(tree_id: TreeId) -> datetime | None:
    return FamilyTreeRecord.objects.using(DATABASE).get(id=tree_id).last_active_at


def activity_of(tree_id: TreeId) -> tuple[datetime, bool]:
    record = FamilyTreeRecord.objects.using(DATABASE).get(id=tree_id)
    assert record.last_active_at is not None
    return record.last_active_at, record.was_seen_as_administrator


def set_last_active(tree_id: TreeId, moment: datetime) -> datetime:
    FamilyTreeRecord.objects.using(DATABASE).filter(id=tree_id).update(last_active_at=moment)
    return moment


def database_clock() -> datetime:
    return scalar("SELECT statement_timestamp()")


def start_of_today() -> datetime:
    return scalar("SELECT date_trunc('day', statement_timestamp())")


def scalar(sql: str) -> datetime:
    with connections[DATABASE].cursor() as cursor:
        cursor.execute(sql)
        [(moment,)] = cursor.fetchall()
    assert isinstance(moment, datetime)
    return moment


def fill(tree_id: TreeId) -> None:
    profile = PersonProfile(
        given_names="Ada", surname="Gone", sex=Sex.FEMALE, birth=LifeEvent(), death=None, biography=""
    )
    parent, child = DjangoPersonRepository(DATABASE).add_many(tree_id, [profile, profile])
    DjangoParentLinkRepository(DATABASE).add(tree_id, parent.id, child.id, ParentLinkKind.BIRTH)
    DjangoPhotoStore(DATABASE).save(tree_id, parent.id, photo_from_bytes(random_jpeg(PHOTO_BYTES)))
    DjangoFamilyTreeRepository(DATABASE).set_home_person(tree_id, child.id)


def lock_and_fill(tree_id: TreeId) -> None:
    DjangoFamilyTreeRepository(DATABASE).lock(tree_id)
    fill(tree_id)


def usage(tree_id: TreeId, measure: UsageMeasure) -> int:
    return PostgresWorkspaceMeter(DATABASE).usage(tree_id, measure)
