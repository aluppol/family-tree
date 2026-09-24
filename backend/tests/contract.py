from collections.abc import Mapping
from typing import Any, TypedDict


class ContractCase(TypedDict):
    id: str
    input_overrides: dict[str, Any]
    expected_overrides: dict[str, Any]


def case_ids(cases: list[ContractCase]) -> list[str]:
    return [case["id"] for case in cases]


def assert_matches(actual: Mapping[str, object], expected: Mapping[str, object]) -> None:
    mismatches = [
        f"{field}: expected {value!r}, got {actual.get(field)!r}"
        for field, value in expected.items()
        if actual.get(field) != value
    ]
    assert not mismatches, "\n".join(mismatches)
