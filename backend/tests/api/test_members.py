from datetime import datetime, timedelta
from io import StringIO

import pytest
from django.core.management import CommandError, call_command
from django.db.models import Value
from django.db.models.functions import Now
from rest_framework.test import APIClient

from family_tree.adapters.persistence.models import FamilyTreeRecord
from family_tree.domain.enums import OwnerKind
from tests.api.builders import add_person, guest, people_count
from tests.conftest import ClientFactory

DEMO_PEOPLE = 65
A_YEAR_AND_A_DAY = timedelta(days=366)


def test_a_members_visits_record_their_activity_once_a_day(member: APIClient) -> None:
    member.get("/api/me/")
    first_visit = activity_of(OwnerKind.MEMBER, "member-one")
    member.get("/api/workspace/")
    assert (first_visit[0] is not None, first_visit[1]) == (True, False)
    assert activity_of(OwnerKind.MEMBER, "member-one") == first_visit


def test_a_guest_visit_records_no_activity(client_for: ClientFactory) -> None:
    guest(client_for, "visit-1").get("/api/me/")
    assert activity_of(OwnerKind.GUEST, "visit-1") == (None, False)


def test_an_administrators_visit_marks_the_tree(administrator: APIClient) -> None:
    administrator.get("/api/me/")
    last_active_at, was_seen_as_administrator = activity_of(OwnerKind.MEMBER, "administrator-one")
    assert (last_active_at is not None, was_seen_as_administrator) == (True, True)


def test_inactive_members_lists_long_absent_members_only(
    client_for: ClientFactory, member: APIClient, administrator: APIClient
) -> None:
    for visitor in (client_for("absent"), member, administrator, guest(client_for, "visit-1")):
        visitor.get("/api/me/")
    absent_since = absent_for_a_year_and_a_day("absent")
    absent_for_a_year_and_a_day("administrator-one")
    assert run("inactive_members", "365") == [
        "Members: 3.",
        "Inactive for at least 365 day(s): 1.",
        f"absent  last active {absent_since:%Y-%m-%d}",
    ]


def test_removing_inactive_members_keeps_everyone_else(
    client_for: ClientFactory, member: APIClient, administrator: APIClient
) -> None:
    absent, visitor = client_for("absent"), guest(client_for, "visit-1")
    for client in (absent, member, administrator, visitor):
        add_person(client, "Kept until now")
    absent_since = absent_for_a_year_and_a_day("absent")
    absent_for_a_year_and_a_day("administrator-one")
    assert run("remove_inactive_members", "365") == [
        "Removed 1 member tree(s) inactive for at least 365 day(s).",
        f"absent  last active {absent_since:%Y-%m-%d}",
    ]
    assert [people_count(client) for client in (absent, member, administrator, visitor)] == [
        0,
        1,
        1,
        DEMO_PEOPLE + 1,
    ]


@pytest.mark.parametrize("command", ["inactive_members", "remove_inactive_members"])
def test_an_inactivity_period_under_a_day_is_refused(command: str) -> None:
    with pytest.raises(CommandError, match=r"^An inactivity period is at least one day\.$"):
        call_command(command, "0", stdout=StringIO())


def activity_of(owner_kind: OwnerKind, key: str) -> tuple[datetime | None, bool]:
    record = FamilyTreeRecord.objects.get(owner_kind=owner_kind.value, owner_key=key)
    return record.last_active_at, record.was_seen_as_administrator


def absent_for_a_year_and_a_day(subject: str) -> datetime:
    trees = FamilyTreeRecord.objects.filter(owner_kind=OwnerKind.MEMBER.value, owner_key=subject)
    trees.update(last_active_at=Now() - Value(A_YEAR_AND_A_DAY))
    last_active_at = trees.get().last_active_at
    assert last_active_at is not None
    return last_active_at


def run(command: str, *arguments: str) -> list[str]:
    output = StringIO()
    call_command(command, *arguments, stdout=output)
    return output.getvalue().splitlines()
