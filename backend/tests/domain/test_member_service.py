from datetime import UTC, datetime
from types import TracebackType
from typing import Any, Self
from unittest.mock import call, create_autospec

import pytest

from family_tree.domain.enums import OwnerKind, Role
from family_tree.domain.errors import InvalidInput
from family_tree.domain.members import InactivityPeriod, MemberActivity
from family_tree.domain.ports import MemberActivityRepository
from family_tree.domain.services.members import MemberService
from family_tree.domain.workspaces import Principal, WorkspaceOwner

MEMBER_TREE = WorkspaceOwner(OwnerKind.MEMBER, "subject-1")
MONTH = InactivityPeriod(30)


class JournaledUnitOfWork:
    def __init__(self, journal: list[str]) -> None:
        self._journal = journal

    def __enter__(self) -> Self:
        self._journal.append("begin")
        return self

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self._journal.append("end")

    def commit(self) -> None:
        self._journal.append("commit")


def journaled_activity(journal: list[str]) -> Any:
    activity = create_autospec(MemberActivityRepository, instance=True)
    for name in ("record_activity", "record_administrator_activity", "delete_inactive_members"):
        getattr(activity, name).side_effect = lambda *_args, name=name: journal.append(name)
    return activity


def principal(roles: frozenset[Role]) -> Principal:
    return Principal(
        subject="subject-1", session_id="session-1", username="user", display_name="User", roles=roles
    )


@pytest.mark.parametrize(
    ("roles", "recorded"),
    [
        (frozenset({Role.USER}), [call.record_activity(MEMBER_TREE)]),
        (frozenset({Role.ADMIN}), [call.record_administrator_activity(MEMBER_TREE)]),
        (frozenset({Role.USER, Role.ADMIN}), [call.record_administrator_activity(MEMBER_TREE)]),
        (frozenset({Role.GUEST}), []),
    ],
)
def test_only_members_have_their_activity_recorded(roles: frozenset[Role], recorded: list[Any]) -> None:
    activity = create_autospec(MemberActivityRepository, instance=True)
    MemberService(unit_of_work=JournaledUnitOfWork([]), activity=activity).record_activity(principal(roles))
    assert activity.method_calls == recorded


@pytest.mark.parametrize(
    ("roles", "journal"),
    [
        (frozenset({Role.USER}), ["begin", "record_activity", "commit", "end"]),
        (frozenset({Role.GUEST}), []),
    ],
)
def test_a_members_activity_is_recorded_inside_a_committed_unit_of_work(
    roles: frozenset[Role], journal: list[str]
) -> None:
    written: list[str] = []
    service = MemberService(unit_of_work=JournaledUnitOfWork(written), activity=journaled_activity(written))
    service.record_activity(principal(roles))
    assert written == journal


def test_inactive_members_are_removed_in_one_unit_of_work() -> None:
    written: list[str] = []
    activity = journaled_activity(written)
    MemberService(unit_of_work=JournaledUnitOfWork(written), activity=activity).remove_inactive_members(MONTH)
    assert written == ["begin", "delete_inactive_members", "commit", "end"]
    activity.delete_inactive_members.assert_called_once_with(MONTH)


def test_members_and_their_inactivity_are_read_from_the_repository() -> None:
    activity = create_autospec(MemberActivityRepository, instance=True)
    absent = MemberActivity(subject="absent", last_active_at=datetime(2025, 1, 2, tzinfo=UTC))
    activity.inactive_members.return_value = [absent]
    activity.count_members.return_value = 3
    service = MemberService(unit_of_work=JournaledUnitOfWork([]), activity=activity)
    assert (service.count_members(), service.inactive_members(MONTH)) == (3, [absent])
    assert activity.method_calls == [call.count_members(), call.inactive_members(MONTH)]


@pytest.mark.parametrize("days", [0, -1])
def test_an_inactivity_period_is_at_least_one_day(days: int) -> None:
    with pytest.raises(InvalidInput) as raised:
        InactivityPeriod(days)
    assert (raised.value.code, raised.value.message) == (
        "members.period_too_short",
        "An inactivity period is at least one day.",
    )


def test_a_one_day_inactivity_period_is_allowed() -> None:
    assert InactivityPeriod(1).days == 1
