from collections.abc import Callable, Hashable, Sequence
from dataclasses import dataclass

from family_tree.domain.dates import GenealogicalDate, is_certainly_later
from family_tree.domain.enums import ParentLinkKind
from family_tree.domain.errors import RuleViolation
from family_tree.domain.people import PersonProfile
from family_tree.domain.relationships import PartnershipTerms

MAX_BIRTH_PARENTS = 2


@dataclass(frozen=True, slots=True, kw_only=True)
class ParentLinkProposal:
    parent_key: Hashable
    child_key: Hashable
    kind: ParentLinkKind
    parent_birth: GenealogicalDate | None
    child_birth: GenealogicalDate | None
    other_parents: tuple[tuple[Hashable, ParentLinkKind], ...]
    child_is_ancestor_of_parent: bool


@dataclass(frozen=True, slots=True, kw_only=True)
class FamilyBirths:
    parents: tuple[GenealogicalDate, ...]
    children: tuple[GenealogicalDate, ...]


def ensure_parent_link_allowed(proposal: ParentLinkProposal) -> None:
    _raise_if_found(find_parent_link_violation(proposal))


def find_parent_link_violation(proposal: ParentLinkProposal) -> RuleViolation | None:
    return _first_violation(_PARENT_LINK_CHECKS, proposal)


def ensure_profile_plausible(profile: PersonProfile) -> None:
    _raise_if_found(find_profile_violation(profile))


def find_profile_violation(profile: PersonProfile) -> RuleViolation | None:
    birth, death = profile.birth_date(), profile.death_date()
    if birth is not None and death is not None and is_certainly_later(birth, death):
        return RuleViolation("profile.death_before_birth", "The death date is before the birth date.")
    return None


def ensure_birth_fits_family(birth: GenealogicalDate | None, family: FamilyBirths) -> None:
    if birth is None:
        return
    if any(is_certainly_later(parent_birth, birth) for parent_birth in family.parents):
        raise RuleViolation("profile.born_before_parent", "This birth date is before a parent's birth.")
    if any(is_certainly_later(birth, child_birth) for child_birth in family.children):
        raise RuleViolation("profile.born_after_child", "This birth date is after a child's birth.")


def ensure_partnership_allowed(partner_keys: tuple[Hashable, Hashable], terms: PartnershipTerms) -> None:
    _raise_if_found(find_partnership_violation(partner_keys, terms))


def find_partnership_violation(
    partner_keys: tuple[Hashable, Hashable], terms: PartnershipTerms
) -> RuleViolation | None:
    if partner_keys[0] == partner_keys[1]:
        return RuleViolation("kinship.self_partner", "A person cannot be their own partner.")
    start, end = terms.start.date, None if terms.end is None else terms.end.date
    if start is not None and end is not None and is_certainly_later(start, end):
        return RuleViolation("partnership.ends_before_start", "The partnership ends before it starts.")
    return None


def _self_parent(proposal: ParentLinkProposal) -> RuleViolation | None:
    if proposal.parent_key != proposal.child_key:
        return None
    return RuleViolation("kinship.self_parent", "A person cannot be their own parent.")


def _duplicate_parent(proposal: ParentLinkProposal) -> RuleViolation | None:
    if all(parent_key != proposal.parent_key for parent_key, _ in proposal.other_parents):
        return None
    return RuleViolation("kinship.duplicate_parent", "This person is already a parent of the child.")


def _cycle(proposal: ParentLinkProposal) -> RuleViolation | None:
    if not proposal.child_is_ancestor_of_parent:
        return None
    return RuleViolation("kinship.cycle", "The child is already an ancestor of this parent.")


def _parent_born_after_child(proposal: ParentLinkProposal) -> RuleViolation | None:
    parent_birth, child_birth = proposal.parent_birth, proposal.child_birth
    if parent_birth is None or child_birth is None or not is_certainly_later(parent_birth, child_birth):
        return None
    return RuleViolation("kinship.parent_born_after_child", "The parent was born after the child.")


def _too_many_birth_parents(proposal: ParentLinkProposal) -> RuleViolation | None:
    birth_parents = sum(kind is ParentLinkKind.BIRTH for _, kind in proposal.other_parents)
    if proposal.kind is not ParentLinkKind.BIRTH or birth_parents < MAX_BIRTH_PARENTS:
        return None
    message = "A child has at most two birth parents; record others as adoptive, foster or other."
    return RuleViolation("kinship.too_many_birth_parents", message)


_PARENT_LINK_CHECKS: Sequence[Callable[[ParentLinkProposal], RuleViolation | None]] = (
    _self_parent,
    _duplicate_parent,
    _cycle,
    _parent_born_after_child,
    _too_many_birth_parents,
)


def _first_violation(
    checks: Sequence[Callable[[ParentLinkProposal], RuleViolation | None]], proposal: ParentLinkProposal
) -> RuleViolation | None:
    return next((violation for check in checks if (violation := check(proposal)) is not None), None)


def _raise_if_found(violation: RuleViolation | None) -> None:
    if violation is not None:
        raise violation
