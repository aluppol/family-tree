from collections import defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from itertools import batched
from operator import attrgetter

from family_tree.domain.enums import ParentLinkKind, Sex
from family_tree.domain.identifiers import PartnershipId, PersonId
from family_tree.domain.interchange import TreeSnapshot
from family_tree.domain.relationships import ParentLink, Partnership, PartnershipTerms

type Couple = frozenset[PersonId]
type ChildrenByParents = Mapping[Couple, tuple["PlannedChild", ...]]

_KIND_ORDER = {kind: position for position, kind in enumerate(ParentLinkKind)}
_SLOT_ORDER = {Sex.MALE: 0, Sex.OTHER: 1, Sex.UNKNOWN: 1, Sex.FEMALE: 2}


@dataclass(frozen=True, slots=True, kw_only=True)
class PlannedChild:
    child_id: PersonId
    kind: ParentLinkKind


@dataclass(frozen=True, slots=True, kw_only=True)
class PlannedFamily:
    xref: str
    husband_id: PersonId | None
    wife_id: PersonId | None
    terms: PartnershipTerms | None
    children: tuple[PlannedChild, ...]

    def partner_ids(self) -> tuple[PersonId, ...]:
        return tuple(partner for partner in (self.husband_id, self.wife_id) if partner is not None)


@dataclass(frozen=True, slots=True, kw_only=True)
class _FamilyDraft:
    parents: tuple[PersonId, ...]
    terms: PartnershipTerms | None
    children: tuple[PlannedChild, ...]


def plan_families(snapshot: TreeSnapshot) -> tuple[PlannedFamily, ...]:
    sexes = {person.id: person.profile.sex for person in snapshot.people}
    known = [partnership for partnership in snapshot.partnerships if _are_known(partnership, sexes)]
    partnerships = sorted(known, key=attrgetter("id"))
    links = [link for link in snapshot.parent_links if {link.parent_id, link.child_id} <= sexes.keys()]
    children_by_parents = _children_by_parents(links, partnerships)
    drafts = [
        *_partnership_drafts(partnerships, children_by_parents),
        *_parents_only_drafts(partnerships, children_by_parents),
    ]
    return tuple(
        _planned_family(f"@F{number}@", draft, sexes) for number, draft in enumerate(drafts, start=1)
    )


def _partnership_drafts(
    partnerships: Sequence[Partnership], children_by_parents: ChildrenByParents
) -> list[_FamilyDraft]:
    first_ids = _first_partnership_ids(partnerships)
    return [
        _FamilyDraft(
            parents=_partners(partnership),
            terms=partnership.terms,
            children=_children_of(partnership, first_ids, children_by_parents),
        )
        for partnership in partnerships
    ]


def _children_of(
    partnership: Partnership,
    first_ids: Mapping[Couple, PartnershipId],
    children_by_parents: ChildrenByParents,
) -> tuple[PlannedChild, ...]:
    couple = _couple(partnership)
    return children_by_parents.get(couple, ()) if first_ids[couple] == partnership.id else ()


def _parents_only_drafts(
    partnerships: Sequence[Partnership], children_by_parents: ChildrenByParents
) -> list[_FamilyDraft]:
    couples = {_couple(partnership) for partnership in partnerships}
    return [
        _FamilyDraft(parents=tuple(sorted(parents)), terms=None, children=children)
        for parents, children in children_by_parents.items()
        if parents not in couples
    ]


def _children_by_parents(
    links: Sequence[ParentLink], partnerships: Sequence[Partnership]
) -> ChildrenByParents:
    couples_by_person = _couples_by_person(partnerships)
    grouped: defaultdict[Couple, list[PlannedChild]] = defaultdict(list)
    for (child_id, kind), parents in _parent_groups(links).items():
        for parent_set in _parent_sets(parents, couples_by_person):
            grouped[parent_set].append(PlannedChild(child_id=child_id, kind=kind))
    return {parents: tuple(children) for parents, children in grouped.items()}


def _parent_groups(links: Sequence[ParentLink]) -> dict[tuple[PersonId, ParentLinkKind], list[PersonId]]:
    ordered = sorted(links, key=lambda link: (link.child_id, _KIND_ORDER[link.kind], link.parent_id))
    groups: defaultdict[tuple[PersonId, ParentLinkKind], list[PersonId]] = defaultdict(list)
    for link in ordered:
        groups[(link.child_id, link.kind)].append(link.parent_id)
    return groups


def _parent_sets(
    parents: Sequence[PersonId], couples_by_person: Mapping[PersonId, list[Couple]]
) -> list[Couple]:
    everyone = frozenset(parents)
    chosen: list[Couple] = []
    for couple in (couple for parent in parents for couple in couples_by_person.get(parent, [])):
        if couple <= everyone and not any(couple & taken for taken in chosen):
            chosen.append(couple)
    paired = frozenset[PersonId]().union(*chosen)
    unpaired = [parent for parent in parents if parent not in paired]
    return [*chosen, *(frozenset(pair) for pair in batched(unpaired, 2, strict=False))]


def _couples_by_person(partnerships: Sequence[Partnership]) -> dict[PersonId, list[Couple]]:
    couples: defaultdict[PersonId, list[Couple]] = defaultdict(list)
    for partnership in partnerships:
        for partner in _partners(partnership):
            couples[partner].append(_couple(partnership))
    return couples


def _first_partnership_ids(partnerships: Sequence[Partnership]) -> dict[Couple, PartnershipId]:
    return {_couple(partnership): partnership.id for partnership in reversed(partnerships)}


def _planned_family(xref: str, draft: _FamilyDraft, sexes: Mapping[PersonId, Sex]) -> PlannedFamily:
    husband_id, wife_id = _slots(draft.parents, sexes)
    return PlannedFamily(
        xref=xref, husband_id=husband_id, wife_id=wife_id, terms=draft.terms, children=draft.children
    )


def _slots(
    parents: Sequence[PersonId], sexes: Mapping[PersonId, Sex]
) -> tuple[PersonId | None, PersonId | None]:
    ordered = sorted(parents, key=lambda parent: _SLOT_ORDER[sexes[parent]])
    if len(ordered) == 2:
        return ordered[0], ordered[1]
    return (None, ordered[0]) if sexes[ordered[0]] is Sex.FEMALE else (ordered[0], None)


def _partners(partnership: Partnership) -> tuple[PersonId, PersonId]:
    return partnership.first_partner_id, partnership.second_partner_id


def _couple(partnership: Partnership) -> Couple:
    return frozenset(_partners(partnership))


def _are_known(partnership: Partnership, sexes: Mapping[PersonId, Sex]) -> bool:
    return all(partner in sexes for partner in _partners(partnership))
