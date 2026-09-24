from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import replace

from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import ParentLinkKind
from family_tree.domain.errors import RuleViolation
from family_tree.domain.interchange import (
    InterchangeDocument,
    InterchangeParentLink,
    InterchangePartnership,
    InterchangePerson,
    SkippedRecord,
)
from family_tree.domain.kinship_rules import (
    ParentLinkProposal,
    find_parent_link_violation,
    find_partnership_violation,
    find_profile_violation,
)

type ParentsByChild = Mapping[str, Sequence[tuple[str, ParentLinkKind]]]

UNKNOWN_PERSON = RuleViolation("kinship.unknown_person", "It refers to a person who is not in the file.")


def vet_document(document: InterchangeDocument) -> InterchangeDocument:
    people, person_skips = _vet_people(document.people)
    births = {person.key: person.profile.birth_date() for person in people}
    links, link_skips = _vet_parent_links(document.parent_links, births)
    partnerships, partnership_skips = _vet_partnerships(document.partnerships, births.keys())
    return InterchangeDocument(
        people=people,
        parent_links=links,
        partnerships=partnerships,
        skipped=(*document.skipped, *person_skips, *link_skips, *partnership_skips),
    )


def _vet_people(
    people: Sequence[InterchangePerson],
) -> tuple[tuple[InterchangePerson, ...], tuple[SkippedRecord, ...]]:
    vetted = tuple(_without_implausible_death_date(person) for person in people)
    skipped = tuple(
        SkippedRecord(
            location=f"{person.key} DEAT DATE", reason=f"{violation.message} The death date is left out."
        )
        for person in people
        if (violation := find_profile_violation(person.profile)) is not None
    )
    return vetted, skipped


def _without_implausible_death_date(person: InterchangePerson) -> InterchangePerson:
    death = person.profile.death
    if death is None or find_profile_violation(person.profile) is None:
        return person
    return replace(person, profile=replace(person.profile, death=replace(death, date=None)))


def _vet_parent_links(
    links: Sequence[InterchangeParentLink], births: Mapping[str, GenealogicalDate | None]
) -> tuple[tuple[InterchangeParentLink, ...], tuple[SkippedRecord, ...]]:
    accepted: list[InterchangeParentLink] = []
    skipped: list[SkippedRecord] = []
    parents_by_child: defaultdict[str, list[tuple[str, ParentLinkKind]]] = defaultdict(list)
    for link in links:
        violation = _parent_link_violation(link, births, parents_by_child)
        if violation is None:
            accepted.append(link)
            parents_by_child[link.child_key].append((link.parent_key, link.kind))
        else:
            location = f"{link.parent_key} parent of {link.child_key}"
            skipped.append(SkippedRecord(location=location, reason=violation.message))
    return tuple(accepted), tuple(skipped)


def _parent_link_violation(
    link: InterchangeParentLink,
    births: Mapping[str, GenealogicalDate | None],
    parents_by_child: ParentsByChild,
) -> RuleViolation | None:
    if link.parent_key not in births or link.child_key not in births:
        return UNKNOWN_PERSON
    proposal = ParentLinkProposal(
        parent_key=link.parent_key,
        child_key=link.child_key,
        kind=link.kind,
        parent_birth=births[link.parent_key],
        child_birth=births[link.child_key],
        other_parents=tuple(parents_by_child.get(link.child_key, ())),
        child_is_ancestor_of_parent=_is_ancestor(link.child_key, link.parent_key, parents_by_child),
    )
    return find_parent_link_violation(proposal)


def _is_ancestor(candidate: str, person: str, parents_by_child: ParentsByChild) -> bool:
    pending, visited = [person], {person}
    while pending:
        for parent_key, _ in parents_by_child.get(pending.pop(), ()):
            if parent_key == candidate:
                return True
            if parent_key not in visited:
                visited.add(parent_key)
                pending.append(parent_key)
    return False


def _vet_partnerships(
    partnerships: Sequence[InterchangePartnership], known_keys: Iterable[str]
) -> tuple[tuple[InterchangePartnership, ...], tuple[SkippedRecord, ...]]:
    keys = frozenset(known_keys)
    verdicts = [(partnership, _partnership_violation(partnership, keys)) for partnership in partnerships]
    accepted = tuple(partnership for partnership, violation in verdicts if violation is None)
    skipped = tuple(
        SkippedRecord(
            location=f"{partnership.first_partner_key} partner of {partnership.second_partner_key}",
            reason=violation.message,
        )
        for partnership, violation in verdicts
        if violation is not None
    )
    return accepted, skipped


def _partnership_violation(partnership: InterchangePartnership, keys: frozenset[str]) -> RuleViolation | None:
    partner_keys = (partnership.first_partner_key, partnership.second_partner_key)
    if not keys.issuperset(partner_keys):
        return UNKNOWN_PERSON
    return find_partnership_violation(partner_keys, partnership.terms)
