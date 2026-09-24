from typing import Any

import pytest

from family_tree.domain.dates import CalendarDate, GenealogicalDate
from family_tree.domain.enums import DateQualifier, ParentLinkKind, PartnershipEndReason, PartnershipKind, Sex
from family_tree.domain.import_vetting import vet_document
from family_tree.domain.interchange import (
    InterchangeDocument,
    InterchangeParentLink,
    InterchangePartnership,
    InterchangePerson,
    SkippedRecord,
)
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.relationships import PartnershipEnd, PartnershipTerms
from tests.contract import ContractCase, assert_matches, case_ids


def on(year: int) -> GenealogicalDate:
    return GenealogicalDate(DateQualifier.EXACT, CalendarDate(year))


def person(key: str, born: int | None, died: int | None = None) -> InterchangePerson:
    death = None if died is None else LifeEvent(date=on(died))
    profile = PersonProfile(
        given_names=key,
        surname="Test",
        sex=Sex.UNKNOWN,
        birth=LifeEvent(date=None if born is None else on(born)),
        death=death,
        biography="",
    )
    return InterchangePerson(key=key, profile=profile)


def link(parent: str, child: str, kind: ParentLinkKind = ParentLinkKind.BIRTH) -> InterchangeParentLink:
    return InterchangeParentLink(parent_key=parent, child_key=child, kind=kind)


def partnership(
    first: str, second: str, start: int | None = None, end: int | None = None
) -> InterchangePartnership:
    ending = None if end is None else PartnershipEnd(reason=PartnershipEndReason.DIVORCE, date=on(end))
    terms = PartnershipTerms(
        kind=PartnershipKind.MARRIAGE, start=LifeEvent(date=None if start is None else on(start)), end=ending
    )
    return InterchangePartnership(first_partner_key=first, second_partner_key=second, terms=terms)


def _base_input() -> dict[str, Any]:
    return {
        "people": (person("grandfather", 1730), person("father", 1766), person("child", 1809)),
        "parent_links": (link("grandfather", "father"), link("father", "child")),
        "partnerships": (),
        "skipped": (),
    }


def _base_expected() -> dict[str, Any]:
    return {"parent_links": 2, "partnerships": 0, "skipped_reasons": [], "death_dates": 0}


CASES: list[ContractCase] = [
    {"id": "clean document", "input_overrides": {}, "expected_overrides": {}},
    {
        "id": "link to a missing person",
        "input_overrides": {"parent_links": (link("grandfather", "father"), link("stranger", "child"))},
        "expected_overrides": {
            "parent_links": 1,
            "skipped_reasons": ["It refers to a person who is not in the file."],
        },
    },
    {
        "id": "loop through three generations",
        "input_overrides": {
            "parent_links": (
                link("grandfather", "father"),
                link("father", "child"),
                link("child", "grandfather"),
            )
        },
        "expected_overrides": {"skipped_reasons": ["The child is already an ancestor of this parent."]},
    },
    {
        "id": "parent born after the child",
        "input_overrides": {"parent_links": (link("grandfather", "father"), link("child", "father"))},
        "expected_overrides": {
            "parent_links": 1,
            "skipped_reasons": ["The parent was born after the child."],
        },
    },
    {
        "id": "duplicate link",
        "input_overrides": {
            "parent_links": (link("grandfather", "father"), link("father", "child"), link("father", "child"))
        },
        "expected_overrides": {"skipped_reasons": ["This person is already a parent of the child."]},
    },
    {
        "id": "death before birth keeps the person without the date",
        "input_overrides": {
            "people": (person("grandfather", 1730, died=1700), person("father", 1766), person("child", 1809))
        },
        "expected_overrides": {
            "skipped_reasons": ["The death date is before the birth date. The death date is left out."],
        },
    },
    {
        "id": "partnership that ends before it starts",
        "input_overrides": {"partnerships": (partnership("grandfather", "father", start=1800, end=1790),)},
        "expected_overrides": {"skipped_reasons": ["The partnership ends before it starts."]},
    },
    {
        "id": "partnership with a missing partner",
        "input_overrides": {"partnerships": (partnership("grandfather", "nobody"),)},
        "expected_overrides": {"skipped_reasons": ["It refers to a person who is not in the file."]},
    },
    {
        "id": "valid partnership",
        "input_overrides": {"partnerships": (partnership("grandfather", "father", start=1790, end=1800),)},
        "expected_overrides": {"partnerships": 1},
    },
    {
        "id": "earlier skips are kept",
        "input_overrides": {"skipped": (SkippedRecord(location="INDI.OCCU", reason="2 occupations"),)},
        "expected_overrides": {"skipped_reasons": ["2 occupations"]},
    },
]


@pytest.mark.parametrize("case", CASES, ids=case_ids(CASES))
def test_vetting(case: ContractCase) -> None:
    vetted = vet_document(InterchangeDocument(**(_base_input() | case["input_overrides"])))
    actual = {
        "parent_links": len(vetted.parent_links),
        "partnerships": len(vetted.partnerships),
        "skipped_reasons": [record.reason for record in vetted.skipped],
        "death_dates": sum(entry.profile.death_date() is not None for entry in vetted.people),
    }
    assert_matches(actual, _base_expected() | case["expected_overrides"])
