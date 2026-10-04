from typing import Any

import pytest

from family_tree.domain.allowances import (
    ALLOWANCES,
    GUEST_ALLOWANCE,
    MEGABYTE,
    MEMBER_ALLOWANCE,
    WorkspaceAllowance,
    allowance_of,
    ensure_upload_allowed,
    ensure_usage_allowed,
    find_usage_violation,
    usage_of_document,
    usage_with,
)
from family_tree.domain.enums import OwnerKind, ParentLinkKind, PartnershipKind, PhotoType, Sex, UsageMeasure
from family_tree.domain.errors import InvalidInput, RuleViolation
from family_tree.domain.interchange import (
    InterchangeDocument,
    InterchangeParentLink,
    InterchangePartnership,
    InterchangePerson,
)
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.photos import Photo
from family_tree.domain.relationships import PartnershipTerms
from tests.contract import ContractCase, assert_matches, case_ids

FULL_SANDBOX_BYTES = 5 * MEGABYTE // 2
PHOTO = Photo(PhotoType.JPEG, b"\xff\xd8\xff" + bytes(997))


def _base_input() -> dict[str, Any]:
    return {
        "owner_kind": OwnerKind.GUEST,
        "people": 300,
        "relationships": 1_500,
        "stored_bytes": FULL_SANDBOX_BYTES,
    }


def _base_expected() -> dict[str, Any]:
    return {"code": None, "message": None}


def _refusal(message: str) -> dict[str, Any]:
    return {"code": "workspace.limit_reached", "message": message}


ALLOWANCE_CASES: list[ContractCase] = [
    {"id": "a guest sandbox filled to every limit", "input_overrides": {}, "expected_overrides": {}},
    {
        "id": "one person too many for a guest",
        "input_overrides": {"people": 301},
        "expected_overrides": _refusal("The demo sandbox holds at most 300 people."),
    },
    {
        "id": "one relationship too many for a guest",
        "input_overrides": {"relationships": 1_501},
        "expected_overrides": _refusal("The demo sandbox holds at most 1,500 parent links and partnerships."),
    },
    {
        "id": "one byte too many for a guest",
        "input_overrides": {"stored_bytes": FULL_SANDBOX_BYTES + 1},
        "expected_overrides": _refusal("The demo sandbox holds at most 2.5 MB of family data and photos."),
    },
    {
        "id": "people are reported first when several limits are passed",
        "input_overrides": {"people": 301, "stored_bytes": 4 * MEGABYTE},
        "expected_overrides": _refusal("The demo sandbox holds at most 300 people."),
    },
    {
        "id": "a member tree filled to its people limit",
        "input_overrides": {"owner_kind": OwnerKind.MEMBER, "people": 50_000},
        "expected_overrides": {},
    },
    {
        "id": "one person too many for a member",
        "input_overrides": {"owner_kind": OwnerKind.MEMBER, "people": 50_001},
        "expected_overrides": _refusal("A family tree here holds at most 50,000 people."),
    },
    {
        "id": "a member tree has no relationship or storage limit",
        "input_overrides": {"owner_kind": OwnerKind.MEMBER, "relationships": 10**9, "stored_bytes": 10**12},
        "expected_overrides": {},
    },
]


@pytest.mark.parametrize("case", ALLOWANCE_CASES, ids=case_ids(ALLOWANCE_CASES))
def test_allowance_rules(case: ContractCase) -> None:
    given = _base_input() | case["input_overrides"]
    usage = {measure: given[measure.value] for measure in UsageMeasure}
    violation = find_usage_violation(allowance_of(given["owner_kind"]), usage)
    actual = {
        "code": None if violation is None else violation.code,
        "message": None if violation is None else violation.message,
    }
    assert_matches(actual, _base_expected() | case["expected_overrides"])


def test_ensure_usage_allowed_raises_the_violation() -> None:
    with pytest.raises(RuleViolation, match="at most 50,000 people"):
        ensure_usage_allowed(MEMBER_ALLOWANCE, {UsageMeasure.PEOPLE: 50_001})


@pytest.mark.parametrize(
    ("allowance", "message"),
    [
        (GUEST_ALLOWANCE, "The file is larger than 2 MB."),
        (MEMBER_ALLOWANCE, "The file is larger than 20 MB."),
    ],
)
def test_uploads_larger_than_the_allowance_are_refused(allowance: WorkspaceAllowance, message: str) -> None:
    ensure_upload_allowed(allowance, allowance.largest_upload_bytes)
    with pytest.raises(InvalidInput) as raised:
        ensure_upload_allowed(allowance, allowance.largest_upload_bytes + 1)
    assert (raised.value.code, raised.value.message) == ("gedcom.too_large", message)


def test_a_document_uses_its_people_relationships_and_photos() -> None:
    assert usage_of_document(two_partners_with_a_child()) == {
        UsageMeasure.PEOPLE: 3,
        UsageMeasure.RELATIONSHIPS: 3,
        UsageMeasure.STORED_BYTES: len(PHOTO.content),
    }


def test_usage_with_an_addition_adds_every_measure_of_the_usage() -> None:
    usage = {UsageMeasure.PEOPLE: 65, UsageMeasure.STORED_BYTES: 1_000}
    addition = {UsageMeasure.PEOPLE: 2, UsageMeasure.RELATIONSHIPS: 3, UsageMeasure.STORED_BYTES: 500}
    assert usage_with(usage, addition) == {UsageMeasure.PEOPLE: 67, UsageMeasure.STORED_BYTES: 1_500}


def test_every_kind_of_owner_has_an_allowance() -> None:
    assert set(ALLOWANCES) == set(OwnerKind)


def two_partners_with_a_child() -> InterchangeDocument:
    profile = PersonProfile(
        given_names="Ada", surname="Byron", sex=Sex.UNKNOWN, birth=LifeEvent(), death=None, biography=""
    )
    people = tuple(InterchangePerson(key=key, profile=profile) for key in ("@I1@", "@I2@"))
    child = InterchangePerson(key="@I3@", profile=profile, photo=PHOTO)
    terms = PartnershipTerms(kind=PartnershipKind.MARRIAGE, start=LifeEvent())
    return InterchangeDocument(
        people=(*people, child),
        parent_links=tuple(
            InterchangeParentLink(parent_key=parent.key, child_key=child.key, kind=ParentLinkKind.BIRTH)
            for parent in people
        ),
        partnerships=(
            InterchangePartnership(first_partner_key="@I1@", second_partner_key="@I2@", terms=terms),
        ),
        skipped=(),
    )
