import pytest

from family_tree.domain.enums import OwnerKind, Role
from family_tree.domain.errors import AccessDenied, InvalidInput
from family_tree.domain.identifiers import TreeId
from family_tree.domain.workspaces import (
    MEMBER_PEOPLE_LIMIT,
    SANDBOX_PEOPLE_LIMIT,
    FamilyTree,
    Principal,
    WorkspaceOwner,
    ensure_room_for,
    workspace_owner_of,
)


def principal(roles: frozenset[Role], session_id: str | None = "session-1") -> Principal:
    return Principal(
        subject="subject-1", session_id=session_id, username="user", display_name="User", roles=roles
    )


@pytest.mark.parametrize(
    ("roles", "session_id", "owner"),
    [
        (frozenset({Role.USER}), "session-1", WorkspaceOwner(OwnerKind.MEMBER, "subject-1")),
        (frozenset({Role.ADMIN}), None, WorkspaceOwner(OwnerKind.MEMBER, "subject-1")),
        (frozenset({Role.USER, Role.GUEST}), "session-1", WorkspaceOwner(OwnerKind.MEMBER, "subject-1")),
        (frozenset({Role.GUEST}), "session-1", WorkspaceOwner(OwnerKind.GUEST, "session-1")),
        (frozenset({Role.GUEST}), None, WorkspaceOwner(OwnerKind.GUEST, "subject-1")),
    ],
)
def test_each_principal_owns_one_workspace(
    roles: frozenset[Role], session_id: str | None, owner: WorkspaceOwner
) -> None:
    assert workspace_owner_of(principal(roles, session_id)) == owner


def test_a_principal_without_a_role_has_no_workspace() -> None:
    with pytest.raises(AccessDenied):
        workspace_owner_of(principal(frozenset()))


@pytest.mark.parametrize(
    ("kind", "limit"),
    [(OwnerKind.MEMBER, MEMBER_PEOPLE_LIMIT), (OwnerKind.GUEST, SANDBOX_PEOPLE_LIMIT)],
)
def test_trees_have_a_size_limit(kind: OwnerKind, limit: int) -> None:
    tree = FamilyTree(id=TreeId(1), owner=WorkspaceOwner(kind, "key"), home_person_id=None)
    ensure_room_for(tree, limit - 10, 10)
    with pytest.raises(InvalidInput) as raised:
        ensure_room_for(tree, limit - 10, 11)
    assert raised.value.code == "workspace.limit_reached"
