from types import TracebackType
from typing import Self
from unittest.mock import create_autospec

from family_tree.domain.enums import Role
from family_tree.domain.errors import WorkspaceAlreadyExists
from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.ports import DemoFamilySource, PersonRepository
from family_tree.domain.services.importing import DocumentImporter
from family_tree.domain.services.workspaces import WorkspaceService
from family_tree.domain.workspaces import FamilyTree, Principal, WorkspaceOwner

MEMBER = Principal(
    subject="racer", session_id=None, username="racer", display_name="Racer", roles=frozenset({Role.USER})
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

    def set_home_person(self, tree_id: TreeId, person_id: PersonId | None) -> None:
        return None

    def count_guest_workspaces(self) -> int:
        return 0

    def delete_guest_workspaces(self) -> None:
        return None

    def delete_oldest_guest_workspaces(self, keep: int) -> None:
        return None


def test_a_workspace_created_meanwhile_by_another_request_is_accepted() -> None:
    trees = TreesCreatedByAnotherRequest()
    service = WorkspaceService(
        unit_of_work=PassThroughUnitOfWork(),
        trees=trees,
        people=create_autospec(PersonRepository, instance=True),
        demo_family=create_autospec(DemoFamilySource, instance=True),
        importer=create_autospec(DocumentImporter, instance=True),
    )
    service.ensure_workspace(MEMBER)
    assert trees.attempts == 1
