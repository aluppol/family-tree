from dataclasses import replace

from family_tree.domain.enums import ParentLinkKind
from family_tree.domain.identifiers import ParentLinkId, PartnershipId, PersonId, TreeId
from family_tree.domain.kinship_rules import (
    ParentLinkProposal,
    ensure_parent_link_allowed,
    ensure_partnership_allowed,
)
from family_tree.domain.ports import (
    KinshipGraph,
    ParentLinkRepository,
    PartnershipRepository,
    PersonRepository,
    UnitOfWork,
)
from family_tree.domain.read_models import PersonSummary
from family_tree.domain.relationships import (
    ParentLink,
    ParentLinkDraft,
    Partnership,
    PartnershipDraft,
    PartnershipTerms,
)
from family_tree.domain.services.workspaces import WorkspaceService
from family_tree.domain.workspaces import Principal


class KinshipService:
    def __init__(
        self,
        *,
        unit_of_work: UnitOfWork,
        workspaces: WorkspaceService,
        people: PersonRepository,
        parent_links: ParentLinkRepository,
        partnerships: PartnershipRepository,
        graph: KinshipGraph,
    ) -> None:
        self._unit_of_work = unit_of_work
        self._workspaces = workspaces
        self._people = people
        self._parent_links = parent_links
        self._partnerships = partnerships
        self._graph = graph

    def link_parent(self, principal: Principal, draft: ParentLinkDraft) -> ParentLink:
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            ensure_parent_link_allowed(self._new_link_proposal(tree_id, draft))
            link = self._parent_links.add(tree_id, draft.parent_id, draft.child_id, draft.kind)
            self._unit_of_work.commit()
        return link

    def change_parent_link_kind(
        self, principal: Principal, link_id: ParentLinkId, kind: ParentLinkKind
    ) -> ParentLink:
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            changed = replace(self._parent_links.get(tree_id, link_id), kind=kind)
            ensure_parent_link_allowed(self._kind_change_proposal(tree_id, changed))
            self._parent_links.change_kind(changed)
            self._unit_of_work.commit()
        return changed

    def unlink_parent(self, principal: Principal, link_id: ParentLinkId) -> None:
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            self._parent_links.get(tree_id, link_id)
            self._parent_links.delete(tree_id, link_id)
            self._unit_of_work.commit()

    def add_partnership(self, principal: Principal, draft: PartnershipDraft) -> Partnership:
        tree_id = self._workspaces.tree_of(principal).id
        partner_ids = (draft.first_partner_id, draft.second_partner_id)
        with self._unit_of_work:
            ensure_partnership_allowed(partner_ids, draft.terms)
            self._people.get(tree_id, draft.first_partner_id)
            self._people.get(tree_id, draft.second_partner_id)
            partnership = self._partnerships.add(tree_id, partner_ids, draft.terms)
            self._unit_of_work.commit()
        return partnership

    def change_partnership_terms(
        self, principal: Principal, partnership_id: PartnershipId, terms: PartnershipTerms
    ) -> Partnership:
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            changed = replace(self._partnerships.get(tree_id, partnership_id), terms=terms)
            ensure_partnership_allowed((changed.first_partner_id, changed.second_partner_id), terms)
            self._partnerships.update_terms(changed)
            self._unit_of_work.commit()
        return changed

    def remove_partnership(self, principal: Principal, partnership_id: PartnershipId) -> None:
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            self._partnerships.get(tree_id, partnership_id)
            self._partnerships.delete(tree_id, partnership_id)
            self._unit_of_work.commit()

    def parent_candidates(self, principal: Principal, child_id: PersonId, text: str) -> list[PersonSummary]:
        tree_id = self._workspaces.tree_of(principal).id
        self._people.get(tree_id, child_id)
        return self._graph.parent_candidates(tree_id, child_id, text)

    def child_candidates(self, principal: Principal, parent_id: PersonId, text: str) -> list[PersonSummary]:
        tree_id = self._workspaces.tree_of(principal).id
        self._people.get(tree_id, parent_id)
        return self._graph.child_candidates(tree_id, parent_id, text)

    def partner_candidates(self, principal: Principal, person_id: PersonId, text: str) -> list[PersonSummary]:
        tree_id = self._workspaces.tree_of(principal).id
        self._people.get(tree_id, person_id)
        return self._graph.partner_candidates(tree_id, person_id, text)

    def _new_link_proposal(self, tree_id: TreeId, draft: ParentLinkDraft) -> ParentLinkProposal:
        parent = self._people.get(tree_id, draft.parent_id)
        child = self._people.get(tree_id, draft.child_id)
        return ParentLinkProposal(
            parent_key=parent.id,
            child_key=child.id,
            kind=draft.kind,
            parent_birth=parent.profile.birth_date(),
            child_birth=child.profile.birth_date(),
            other_parents=tuple(
                (link.parent_id, link.kind) for link in self._parent_links.parents_of(tree_id, child.id)
            ),
            child_is_ancestor_of_parent=self._graph.is_ancestor(tree_id, child.id, parent.id),
        )

    def _kind_change_proposal(self, tree_id: TreeId, changed: ParentLink) -> ParentLinkProposal:
        siblings_links = self._parent_links.parents_of(tree_id, changed.child_id)
        return ParentLinkProposal(
            parent_key=changed.parent_id,
            child_key=changed.child_id,
            kind=changed.kind,
            parent_birth=None,
            child_birth=None,
            other_parents=tuple(
                (link.parent_id, link.kind) for link in siblings_links if link.id != changed.id
            ),
            child_is_ancestor_of_parent=False,
        )
