from collections.abc import Callable

from family_tree.domain.enums import InterchangeFormat
from family_tree.domain.identifiers import TreeId
from family_tree.domain.import_vetting import vet_document
from family_tree.domain.interchange import ImportOutcome, ImportReport, InterchangeDocument, TreeSnapshot
from family_tree.domain.ports import (
    FamilyTreeRepository,
    InterchangeReader,
    InterchangeWriter,
    ParentLinkRepository,
    PartnershipRepository,
    PersonRepository,
    PhotoStore,
    UnitOfWork,
)
from family_tree.domain.services.importing import DocumentImporter, report_of
from family_tree.domain.services.workspaces import WorkspaceService
from family_tree.domain.workspaces import FamilyTree, Principal


class InterchangeService:
    def __init__(
        self,
        *,
        unit_of_work: UnitOfWork,
        workspaces: WorkspaceService,
        reader: InterchangeReader,
        writer_for: Callable[[InterchangeFormat], InterchangeWriter],
        importer: DocumentImporter,
        trees: FamilyTreeRepository,
        repositories: tuple[PersonRepository, ParentLinkRepository, PartnershipRepository, PhotoStore],
    ) -> None:
        self._unit_of_work = unit_of_work
        self._workspaces = workspaces
        self._reader = reader
        self._writer_for = writer_for
        self._importer = importer
        self._trees = trees
        self._people, self._parent_links, self._partnerships, self._photos = repositories

    def preview(self, principal: Principal, payload: bytes) -> ImportReport:
        return report_of(self._vetted_document(self._workspaces.tree_of(principal), payload))

    def import_file(self, principal: Principal, payload: bytes) -> ImportOutcome:
        tree = self._workspaces.tree_of(principal)
        document = self._vetted_document(tree, payload)
        self._workspaces.ensure_document_within_allowance(tree, document)
        with self._unit_of_work:
            self._workspaces.lock(tree)
            outcome = self._importer.import_document(tree.id, document)
            if tree.home_person_id is None:
                self._trees.set_home_person(tree.id, outcome.home_person_id)
            self._workspaces.ensure_within_allowance(tree)
            self._unit_of_work.commit()
        return outcome

    def export(self, principal: Principal, interchange_format: InterchangeFormat) -> bytes:
        writer = self._writer_for(interchange_format)
        return writer.write(self._snapshot(self._workspaces.tree_of(principal).id))

    def _vetted_document(self, tree: FamilyTree, payload: bytes) -> InterchangeDocument:
        self._workspaces.ensure_upload_within_allowance(tree, len(payload))
        return vet_document(self._reader.read(payload))

    def _snapshot(self, tree_id: TreeId) -> TreeSnapshot:
        return TreeSnapshot(
            people=tuple(self._people.all(tree_id)),
            parent_links=tuple(self._parent_links.all(tree_id)),
            partnerships=tuple(self._partnerships.all(tree_id)),
            photos=self._photos.all(tree_id),
        )
