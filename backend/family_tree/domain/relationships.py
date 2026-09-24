from dataclasses import dataclass

from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import ParentLinkKind, PartnershipEndReason, PartnershipKind
from family_tree.domain.identifiers import ParentLinkId, PartnershipId, PersonId, TreeId
from family_tree.domain.people import LifeEvent


@dataclass(frozen=True, slots=True, kw_only=True)
class ParentLink:
    id: ParentLinkId
    tree_id: TreeId
    parent_id: PersonId
    child_id: PersonId
    kind: ParentLinkKind


@dataclass(frozen=True, slots=True, kw_only=True)
class PartnershipEnd:
    reason: PartnershipEndReason
    date: GenealogicalDate | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class PartnershipTerms:
    kind: PartnershipKind
    start: LifeEvent
    end: PartnershipEnd | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class Partnership:
    id: PartnershipId
    tree_id: TreeId
    first_partner_id: PersonId
    second_partner_id: PersonId
    terms: PartnershipTerms

    def partner_of(self, person_id: PersonId) -> PersonId:
        return self.second_partner_id if person_id == self.first_partner_id else self.first_partner_id


@dataclass(frozen=True, slots=True, kw_only=True)
class ParentLinkDraft:
    parent_id: PersonId
    child_id: PersonId
    kind: ParentLinkKind


@dataclass(frozen=True, slots=True, kw_only=True)
class PartnershipDraft:
    first_partner_id: PersonId
    second_partner_id: PersonId
    terms: PartnershipTerms
