from collections.abc import Iterator
from pathlib import Path

import pytest

from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.errors import InvalidInput
from tests.adapters.gedcom.builders import gedcom_bytes
from tests.contract import ContractCase, case_ids

MEGABYTE = 1024 * 1024
HEADER = "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8"
MISSING_HEADER = "must be '0 HEAD': a GEDCOM file starts with its header."

MALFORMED_CASES: list[ContractCase] = [
    {
        "id": "empty_file",
        "input_overrides": {"payload": b""},
        "expected_overrides": {"message": f"Line 1 {MISSING_HEADER}"},
    },
    {
        "id": "file_without_a_header",
        "input_overrides": {"payload": gedcom_bytes("0 @I1@ INDI", "1 NAME Anne /Darwin/", "0 TRLR")},
        "expected_overrides": {"message": f"Line 1 {MISSING_HEADER}"},
    },
    {
        "id": "header_at_the_wrong_level_after_blank_lines",
        "input_overrides": {"payload": b"\n\n1 HEAD\n"},
        "expected_overrides": {"message": f"Line 3 {MISSING_HEADER}"},
    },
    {
        "id": "level_jump",
        "input_overrides": {"payload": gedcom_bytes("0 HEAD", "1 GEDC", "3 VERS 5.5.1")},
        "expected_overrides": {"message": "Line 3 jumps from level 1 to level 3."},
    },
    {
        "id": "text_that_is_not_a_gedcom_line",
        "input_overrides": {
            "payload": gedcom_bytes(HEADER, "Dear cousin, here is the family tree you asked for")
        },
        "expected_overrides": {
            "message": "Line 5 is not a GEDCOM line: 'Dear cousin, here is the family tree you'."
        },
    },
    {
        "id": "line_without_a_tag",
        "input_overrides": {"payload": gedcom_bytes(HEADER, "0 @I1@")},
        "expected_overrides": {"message": "Line 5 is not a GEDCOM line: '0 @I1@'."},
    },
    {
        "id": "level_above_ninety_nine",
        "input_overrides": {"payload": gedcom_bytes(HEADER, "100 NAME Anne")},
        "expected_overrides": {"message": "Line 5 is not a GEDCOM line: '100 NAME Anne'."},
    },
    {
        "id": "image_uploaded_by_mistake",
        "input_overrides": {"payload": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"},
        "expected_overrides": {"message": "Line 1 contains a byte that is not valid UTF-8."},
    },
]


@pytest.mark.parametrize("case", MALFORMED_CASES, ids=case_ids(MALFORMED_CASES))
def test_reader_rejects_malformed_files(case: ContractCase) -> None:
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(case["input_overrides"]["payload"])
    assert (raised.value.code, raised.value.message) == (
        "gedcom.unreadable",
        case["expected_overrides"]["message"],
    )


def test_reader_accepts_every_line_break_and_indentation() -> None:
    payload = b"0 HEAD\r\n1 GEDC\r2 VERS 5.5.1\n  0 @I1@ INDI\n\t1 NAME Anne /Darwin/\r\n\n0 TRLR"
    people = GedcomReader().read(payload).people
    assert [(person.key, person.profile.full_name()) for person in people] == [("@I1@", "Anne Darwin")]


def test_reader_rejects_a_payload_over_twenty_megabytes() -> None:
    payload = gedcom_bytes(HEADER, "0 TRLR") + b" " * (20 * MEGABYTE)
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(payload)
    assert (raised.value.code, raised.value.message) == ("gedcom.too_large", "The file is larger than 20 MB.")


def test_reader_accepts_a_payload_of_exactly_twenty_megabytes() -> None:
    frame = gedcom_bytes(HEADER, "1 NOTE ", "0 TRLR")
    payload = frame.replace(b"1 NOTE ", b"1 NOTE " + b"x" * (20 * MEGABYTE - len(frame)))
    assert len(payload) == 20 * MEGABYTE
    assert GedcomReader().read(payload).people == ()


def test_reader_rejects_more_than_fifty_thousand_people() -> None:
    individuals = (f"0 @I{number}@ INDI" for number in range(1, 50_002))
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(gedcom_bytes(HEADER, *individuals, "0 TRLR"))
    expected = "The file has 50,001 people; at most 50,000 can be imported at once."
    assert (raised.value.code, raised.value.message) == ("gedcom.too_large", expected)


def test_damaged_copies_of_a_real_file_are_read_or_rejected_as_unreadable() -> None:
    lines = (Path(__file__).with_name("fixtures") / "darwin_wedgwood.ged").read_bytes().split(b"\n")
    outcomes = {_outcome(variant) for variant in _damaged_copies(lines)}
    assert outcomes == {"read", "gedcom.unreadable"}


def _damaged_copies(lines: list[bytes]) -> Iterator[bytes]:
    damages = (_without_line, _cut_before_line, _with_line_one_level_deeper)
    for index in range(len(lines)):
        yield damages[index % len(damages)](lines, index)


def _without_line(lines: list[bytes], index: int) -> bytes:
    return b"\n".join([*lines[:index], *lines[index + 1 :]])


def _cut_before_line(lines: list[bytes], index: int) -> bytes:
    return b"\n".join(lines[:index])


def _with_line_one_level_deeper(lines: list[bytes], index: int) -> bytes:
    return b"\n".join([*lines[:index], b"2 " + lines[index], *lines[index + 1 :]])


def _outcome(payload: bytes) -> str:
    try:
        GedcomReader().read(payload)
    except InvalidInput as error:
        return error.code
    return "read"
