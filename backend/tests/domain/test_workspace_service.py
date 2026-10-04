from types import TracebackType
from typing import Any, Self
from unittest.mock import call, create_autospec

import pytest

from family_tree.domain.enums import OwnerKind, Role, Sex, UsageMeasure
from family_tree.domain.errors import RuleViolation, WorkspaceAlreadyExists
from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.interchange import InterchangeDocument, InterchangePerson
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.ports import DemoFamilySource, FamilyTreeRepository, PersonRepository, WorkspaceMeter
from family_tree.domain.services.importing import DocumentImporter
from family_tree.domain.services.workspaces import WorkspaceService
from family_tree.domain.workspaces import FamilyTree, Principal, WorkspaceOwner

MEMBER = Principal(
    subject="racer", session_id=None, username="racer", display_name="Racer", roles=frozenset({Role.USER})
)
ONE_PERSON = InterchangeDocument(
    people=(
        InterchangePerson(
            key="@I1@",
            profile=PersonProfile(
                given_names="Ada",
                surname="Byron",
                sex=Sex.UNKNOWN,
                birth=LifeEvent(),
                death=None,
                biography="",
            ),
        ),
    ),
    parent_links=(),
    partnerships=(),
    skipped=(),
)


class PassThroughUnitOfWork:
    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        return None

    def commit(self) -> None:
        return None


class TreesCreatedByAnotherRequest:
    def __init__(self) -> None:
        self.attempts = 0

    def find_by_owner(self, owner: WorkspaceOwner) -> FamilyTree | None:
        return None

    def add(self, owner: WorkspaceOwner) -> FamilyTree:
        self.attempts += 1
        raise WorkspaceAlreadyExists("workspace.exists", "This family tree already exists.")

    def lock(self, tree_id: TreeId) -> None:
        return None

    def set_home_person(self, tree_id: TreeId, person_id: PersonId | None) -> None:
        return None

    def count_guest_workspaces(self) -> int:
        return 0

    def delete_guest_workspaces(self) -> None:
        return None

    def delete_oldest_guest_workspaces(self, keep: int) -> None:
        return None


def service_with(trees: FamilyTreeRepository, meter: WorkspaceMeter) -> WorkspaceService:
    return WorkspaceService(
        unit_of_work=PassThroughUnitOfWork(),
        trees=trees,
        people=create_autospec(PersonRepository, instance=True),
        meter=meter,
        demo_family=create_autospec(DemoFamilySource, instance=True),
        importer=create_autospec(DocumentImporter, instance=True),
    )


def tree_of(owner_kind: OwnerKind) -> FamilyTree:
    return FamilyTree(id=TreeId(7), owner=WorkspaceOwner(owner_kind, "owner"), home_person_id=None)


def meter_reading(amount: int) -> Any:
    meter = create_autospec(WorkspaceMeter, instance=True)
    meter.usage.return_value = amount
    return meter


def test_a_workspace_created_meanwhile_by_another_request_is_accepted() -> None:
    trees = TreesCreatedByAnotherRequest()
    service_with(trees, meter_reading(0)).ensure_workspace(MEMBER)
    assert trees.attempts == 1


def test_locking_a_workspace_locks_its_tree() -> None:
    trees = create_autospec(FamilyTreeRepository, instance=True)
    service_with(trees, meter_reading(0)).lock(tree_of(OwnerKind.GUEST))
    trees.lock.assert_called_once_with(TreeId(7))


@pytest.mark.parametrize(
    ("owner_kind", "measures"),
    [
        (OwnerKind.MEMBER, [UsageMeasure.PEOPLE]),
        (OwnerKind.GUEST, [UsageMeasure.PEOPLE, UsageMeasure.RELATIONSHIPS, UsageMeasure.STORED_BYTES]),
    ],
)
def test_only_what_the_allowance_limits_is_measured(
    owner_kind: OwnerKind, measures: list[UsageMeasure]
) -> None:
    meter = meter_reading(0)
    service_with(create_autospec(FamilyTreeRepository, instance=True), meter).ensure_within_allowance(
        tree_of(owner_kind)
    )
    assert meter.usage.call_args_list == [call(TreeId(7), measure) for measure in measures]


def test_a_tree_past_its_allowance_is_refused() -> None:
    service = service_with(create_autospec(FamilyTreeRepository, instance=True), meter_reading(50_001))
    with pytest.raises(RuleViolation, match="at most 50,000 people"):
        service.ensure_within_allowance(tree_of(OwnerKind.MEMBER))


def test_a_document_is_judged_together_with_what_the_tree_holds() -> None:
    trees, member_tree = create_autospec(FamilyTreeRepository, instance=True), tree_of(OwnerKind.MEMBER)
    service_with(trees, meter_reading(49_999)).ensure_document_within_allowance(member_tree, ONE_PERSON)
    with pytest.raises(RuleViolation, match="at most 50,000 people"):
        service_with(trees, meter_reading(50_000)).ensure_document_within_allowance(member_tree, ONE_PERSON)
