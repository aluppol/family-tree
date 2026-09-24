from typing import Any

import pytest

from family_tree.domain.dates import CalendarDate, GenealogicalDate
from family_tree.domain.enums import DateQualifier, ParentLinkKind, PartnershipEndReason, PartnershipKind, Sex
from family_tree.domain.errors import RuleViolation
from family_tree.domain.kinship_rules import (
    FamilyBirths,
    ParentLinkProposal,
    ensure_birth_fits_family,
    ensure_parent_link_allowed,
    ensure_partnership_allowed,
    ensure_profile_plausible,
    find_parent_link_violation,
    find_partnership_violation,
    find_profile_violation,
)
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.relationships import PartnershipEnd, PartnershipTerms
from tests.contract import ContractCase, assert_matches, case_ids


def on(year: int) -> GenealogicalDate:
    return GenealogicalDate(DateQualifier.EXACT, CalendarDate(year))


def about(year: int) -> GenealogicalDate:
    return GenealogicalDate(DateQualifier.ABOUT, CalendarDate(year))


def _base_link_input() -> dict[str, Any]:
    return {
        "parent_key": 1,
        "child_key": 2,
        "kind": ParentLinkKind.BIRTH,
        "parent_birth": on(1776),
        "child_birth": on(1809),
        "other_parents": (),
        "child_is_ancestor_of_parent": False,
    }


def _base_link_expected() -> dict[str, Any]:
    return {"violation": None}


PARENT_LINK_CASES: list[ContractCase] = [
    {"id": "plausible birth link", "input_overrides": {}, "expected_overrides": {}},
    {
        "id": "own parent",
        "input_overrides": {"parent_key": 2},
        "expected_overrides": {"violation": "kinship.self_parent"},
    },
    {
        "id": "already a parent",
        "input_overrides": {"other_parents": ((1, ParentLinkKind.ADOPTED),)},
        "expected_overrides": {"violation": "kinship.duplicate_parent"},
    },
    {
        "id": "child is an ancestor of the parent",
        "input_overrides": {"child_is_ancestor_of_parent": True},
        "expected_overrides": {"violation": "kinship.cycle"},
    },
    {
        "id": "parent born after the child",
        "input_overrides": {"parent_birth": on(1810)},
        "expected_overrides": {"violation": "kinship.parent_born_after_child"},
    },
    {
        "id": "same birth year stays plausible",
        "input_overrides": {"parent_birth": on(1809)},
        "expected_overrides": {},
    },
    {
        "id": "approximate overlap stays plausible",
        "input_overrides": {"parent_birth": about(1815)},
        "expected_overrides": {},
    },
    {
        "id": "unknown birth is not judged",
        "input_overrides": {"parent_birth": None},
        "expected_overrides": {},
    },
    {
        "id": "third birth parent",
        "input_overrides": {"other_parents": ((3, ParentLinkKind.BIRTH), (4, ParentLinkKind.BIRTH))},
        "expected_overrides": {"violation": "kinship.too_many_birth_parents"},
    },
    {
        "id": "adoptive parent beside two birth parents",
        "input_overrides": {
            "kind": ParentLinkKind.ADOPTED,
            "other_parents": ((3, ParentLinkKind.BIRTH), (4, ParentLinkKind.BIRTH)),
        },
        "expected_overrides": {},
    },
    {
        "id": "self link reports the most basic rule first",
        "input_overrides": {"parent_key": 2, "child_is_ancestor_of_parent": True},
        "expected_overrides": {"violation": "kinship.self_parent"},
    },
]


@pytest.mark.parametrize("case", PARENT_LINK_CASES, ids=case_ids(PARENT_LINK_CASES))
def test_parent_link_rules(case: ContractCase) -> None:
    proposal = ParentLinkProposal(**(_base_link_input() | case["input_overrides"]))
    violation = find_parent_link_violation(proposal)
    actual = {"violation": None if violation is None else violation.code}
    assert_matches(actual, _base_link_expected() | case["expected_overrides"])


def test_ensure_parent_link_allowed_raises_the_violation() -> None:
    with pytest.raises(RuleViolation, match="cannot be their own parent"):
        ensure_parent_link_allowed(ParentLinkProposal(**(_base_link_input() | {"parent_key": 2})))


def _profile(birth: GenealogicalDate | None, death: GenealogicalDate | None) -> PersonProfile:
    return PersonProfile(
        given_names="Charles",
        surname="Darwin",
        sex=Sex.MALE,
        birth=LifeEvent(date=birth),
        death=LifeEvent(date=death),
        biography="",
    )


@pytest.mark.parametrize(
    ("birth", "death", "code"),
    [
        (on(1809), on(1882), None),
        (on(1882), on(1809), "profile.death_before_birth"),
        (None, on(1809), None),
        (about(1809), on(1805), None),
    ],
)
def test_profile_plausibility(
    birth: GenealogicalDate | None, death: GenealogicalDate | None, code: str | None
) -> None:
    violation = find_profile_violation(_profile(birth, death))
    assert (None if violation is None else violation.code) == code


def test_ensure_profile_plausible_raises() -> None:
    with pytest.raises(RuleViolation, match="death date is before the birth date"):
        ensure_profile_plausible(_profile(on(1882), on(1809)))


@pytest.mark.parametrize(
    ("birth", "family", "code"),
    [
        (on(1809), FamilyBirths(parents=(on(1766),), children=(on(1839),)), None),
        (on(1760), FamilyBirths(parents=(on(1766),), children=()), "profile.born_before_parent"),
        (on(1845), FamilyBirths(parents=(), children=(on(1839),)), "profile.born_after_child"),
        (None, FamilyBirths(parents=(on(1900),), children=()), None),
    ],
)
def test_birth_must_fit_the_family(
    birth: GenealogicalDate | None, family: FamilyBirths, code: str | None
) -> None:
    if code is None:
        ensure_birth_fits_family(birth, family)
        return
    with pytest.raises(RuleViolation) as raised:
        ensure_birth_fits_family(birth, family)
    assert raised.value.code == code


def _terms(start: GenealogicalDate | None, end: GenealogicalDate | None) -> PartnershipTerms:
    ending = None if end is None else PartnershipEnd(reason=PartnershipEndReason.DIVORCE, date=end)
    return PartnershipTerms(kind=PartnershipKind.MARRIAGE, start=LifeEvent(date=start), end=ending)


@pytest.mark.parametrize(
    ("partner_keys", "terms", "code"),
    [
        ((1, 2), _terms(on(1839), None), None),
        ((1, 1), _terms(on(1839), None), "kinship.self_partner"),
        ((1, 2), _terms(on(1839), on(1830)), "partnership.ends_before_start"),
        ((1, 2), _terms(None, on(1830)), None),
        ((1, 2), _terms(on(1839), on(1845)), None),
    ],
)
def test_partnership_rules(partner_keys: tuple[int, int], terms: PartnershipTerms, code: str | None) -> None:
    violation = find_partnership_violation(partner_keys, terms)
    assert (None if violation is None else violation.code) == code


def test_ensure_partnership_allowed_raises() -> None:
    with pytest.raises(RuleViolation, match="their own partner"):
        ensure_partnership_allowed((5, 5), _terms(None, None))
