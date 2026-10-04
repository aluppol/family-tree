from collections.abc import Callable, Mapping

from family_tree.domain.allowances import (
    WorkspaceAllowance,
    WorkspaceUsage,
    allowance_of,
    ensure_upload_allowed,
    ensure_usage_allowed,
    usage_of_document,
    usage_with,
)
from family_tree.domain.enums import OwnerKind
from family_tree.domain.errors import NotFound, WorkspaceAlreadyExists
from family_tree.domain.identifiers import PersonId
from family_tree.domain.import_vetting import vet_document
from family_tree.domain.interchange import InterchangeDocument
from family_tree.domain.ports import (
    DemoFamilySource,
    FamilyTreeRepository,
    PersonRepository,
    UnitOfWork,
    WorkspaceMeter,
)
from family_tree.domain.services.importing import DocumentImporter
from family_tree.domain.workspaces import (
    FamilyTree,
    Principal,
    WorkspaceOverview,
    WorkspaceOwner,
    workspace_owner_of,
)

MAX_GUEST_WORKSPACES = 500


class WorkspaceService:
    def __init__(
        self,
        *,
        unit_of_work: UnitOfWork,
        trees: FamilyTreeRepository,
        people: PersonRepository,
        meter: WorkspaceMeter,
        demo_family: DemoFamilySource,
        importer: DocumentImporter,
    ) -> None:
        self._unit_of_work = unit_of_work
        self._trees = trees
        self._people = people
        self._meter = meter
        self._demo_family = demo_family
        self._importer = importer
        self._provisioners: Mapping[OwnerKind, Callable[[WorkspaceOwner], None]] = {
            OwnerKind.MEMBER: self._provision_member_workspace,
            OwnerKind.GUEST: self._provision_guest_workspace,
        }

    def ensure_workspace(self, principal: Principal) -> None:
        owner = workspace_owner_of(principal)
        if self._trees.find_by_owner(owner) is not None:
            return
        try:
            with self._unit_of_work:
                self._provisioners[owner.kind](owner)
                self._unit_of_work.commit()
        except WorkspaceAlreadyExists:
            return

    def tree_of(self, principal: Principal) -> FamilyTree:
        tree = self._trees.find_by_owner(workspace_owner_of(principal))
        if tree is None:
            raise NotFound("workspace.not_found", "Your family tree is not ready yet; reload the page.")
        return tree

    def overview(self, principal: Principal) -> WorkspaceOverview:
        tree = self.tree_of(principal)
        allowance = allowance_of(tree.owner.kind)
        return WorkspaceOverview(tree=tree, people_count=self._people.count(tree.id), allowance=allowance)

    def choose_home_person(self, principal: Principal, person_id: PersonId | None) -> None:
        tree = self.tree_of(principal)
        with self._unit_of_work:
            self.lock(tree)
            if person_id is not None:
                self._people.get(tree.id, person_id)
            self._trees.set_home_person(tree.id, person_id)
            self._unit_of_work.commit()

    def lock(self, tree: FamilyTree) -> None:
        self._trees.lock(tree.id)

    def ensure_within_allowance(self, tree: FamilyTree) -> None:
        allowance = allowance_of(tree.owner.kind)
        ensure_usage_allowed(allowance, self._measured_usage(tree, allowance))

    def ensure_document_within_allowance(self, tree: FamilyTree, document: InterchangeDocument) -> None:
        allowance = allowance_of(tree.owner.kind)
        usage = usage_with(self._measured_usage(tree, allowance), usage_of_document(document))
        ensure_usage_allowed(allowance, usage)

    def ensure_upload_within_allowance(self, tree: FamilyTree, upload_bytes: int) -> None:
        ensure_upload_allowed(allowance_of(tree.owner.kind), upload_bytes)

    def _provision_member_workspace(self, owner: WorkspaceOwner) -> None:
        self._trees.add(owner)

    def _provision_guest_workspace(self, owner: WorkspaceOwner) -> None:
        self._trees.delete_oldest_guest_workspaces(keep=MAX_GUEST_WORKSPACES - 1)
        tree = self._trees.add(owner)
        outcome = self._importer.import_document(tree.id, vet_document(self._demo_family.load()))
        self._trees.set_home_person(tree.id, outcome.home_person_id)

    def _measured_usage(self, tree: FamilyTree, allowance: WorkspaceAllowance) -> WorkspaceUsage:
        return {measure: self._meter.usage(tree.id, measure) for measure in allowance.ceilings}
