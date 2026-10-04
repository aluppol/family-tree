from dataclasses import dataclass

from family_tree.domain.allowances import WorkspaceAllowance
from family_tree.domain.enums import OwnerKind, Role
from family_tree.domain.errors import AccessDenied
from family_tree.domain.identifiers import PersonId, TreeId

MEMBER_ROLES = frozenset({Role.USER, Role.ADMIN})


@dataclass(frozen=True, slots=True)
class WorkspaceOwner:
    kind: OwnerKind
    key: str


@dataclass(frozen=True, slots=True, kw_only=True)
class FamilyTree:
    id: TreeId
    owner: WorkspaceOwner
    home_person_id: PersonId | None

    def is_sandbox(self) -> bool:
        return self.owner.kind is OwnerKind.GUEST


@dataclass(frozen=True, slots=True, kw_only=True)
class Principal:
    subject: str
    session_id: str | None
    username: str
    display_name: str
    roles: frozenset[Role]

    def is_member(self) -> bool:
        return bool(self.roles & MEMBER_ROLES)

    def is_guest(self) -> bool:
        return not self.is_member() and Role.GUEST in self.roles


@dataclass(frozen=True, slots=True, kw_only=True)
class WorkspaceOverview:
    tree: FamilyTree
    people_count: int
    allowance: WorkspaceAllowance


def workspace_owner_of(principal: Principal) -> WorkspaceOwner:
    if principal.is_member():
        return WorkspaceOwner(OwnerKind.MEMBER, principal.subject)
    if principal.is_guest():
        return WorkspaceOwner(OwnerKind.GUEST, principal.session_id or principal.subject)
    raise AccessDenied("auth.forbidden", "Your account has no access to Family Tree.")
