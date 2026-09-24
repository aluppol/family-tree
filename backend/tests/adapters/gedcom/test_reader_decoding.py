import pytest

from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.errors import InvalidInput
from tests.contract import ContractCase, case_ids

UTF16_LITTLE_ENDIAN_MARK = b"\xff\xfe"
UTF16_BIG_ENDIAN_MARK = b"\xfe\xff"
UTF8_MARK = b"\xef\xbb\xbf"


def document(charset: str, name: str, line_break: str = "\n") -> str:
    header = ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", *([f"1 CHAR {charset}"] if charset else [])]
    return line_break.join([*header, "0 @I1@ INDI", f"1 NAME {name}", "0 TRLR", ""])


def ansel_document(name: bytes) -> bytes:
    return document("ANSEL", "{name}").encode("ascii").replace(b"{name}", name)


DECODING_CASES: list[ContractCase] = [
    {
        "id": "utf8_without_byte_order_mark",
        "input_overrides": {"payload": document("UTF-8", "Émile /Zola/").encode("utf-8")},
        "expected_overrides": {"given_names": "Émile", "surname": "Zola"},
    },
    {
        "id": "utf8_with_byte_order_mark",
        "input_overrides": {"payload": UTF8_MARK + document("UTF-8", "Émile /Zola/").encode("utf-8")},
        "expected_overrides": {"given_names": "Émile", "surname": "Zola"},
    },
    {
        "id": "utf8_is_assumed_without_a_charset",
        "input_overrides": {"payload": document("", "Małgorzata /Nowak/").encode("utf-8")},
        "expected_overrides": {"given_names": "Małgorzata", "surname": "Nowak"},
    },
    {
        "id": "utf16_little_endian_with_byte_order_mark",
        "input_overrides": {
            "payload": UTF16_LITTLE_ENDIAN_MARK + document("UNICODE", "Сергей /Ivanov/").encode("utf-16-le")
        },
        "expected_overrides": {"given_names": "Сергей", "surname": "Ivanov"},
    },
    {
        "id": "utf16_big_endian_with_byte_order_mark",
        "input_overrides": {
            "payload": UTF16_BIG_ENDIAN_MARK + document("UNICODE", "李 /Wang/", "\r\n").encode("utf-16-be")
        },
        "expected_overrides": {"given_names": "李", "surname": "Wang"},
    },
    {
        "id": "ascii",
        "input_overrides": {"payload": document("ASCII", "Charles /Darwin/").encode("ascii")},
        "expected_overrides": {"given_names": "Charles", "surname": "Darwin"},
    },
    {
        "id": "ansel_diacritic_is_placed_after_its_letter",
        "input_overrides": {"payload": ansel_document(b"\xe2Emile /Zola/")},
        "expected_overrides": {"given_names": "Émile", "surname": "Zola"},
    },
    {
        "id": "ansel_spacing_letters",
        "input_overrides": {"payload": ansel_document(b"\xa1ukasz /Gr\xb2nwald/")},
        "expected_overrides": {"given_names": "Łukasz", "surname": "Grønwald"},
    },
    {
        "id": "ansel_stacked_diacritics_keep_their_order",
        "input_overrides": {"payload": ansel_document(b"\xe8\xe5a /Nguy\xe3\xe2en/")},
        "expected_overrides": {"given_names": "ǟ", "surname": "Nguyến"},
    },
    {
        "id": "ansel_with_carriage_return_line_breaks",
        "input_overrides": {
            "payload": document("ANSEL", "{name}", "\r")
            .encode("ascii")
            .replace(b"{name}", b"Fran\xf0cois /M\xe8uller/")
        },
        "expected_overrides": {"given_names": "François", "surname": "Müller"},
    },
    {
        "id": "charset_name_is_case_insensitive",
        "input_overrides": {"payload": document("utf-8", "Anne /Darwin/").encode("utf-8")},
        "expected_overrides": {"given_names": "Anne", "surname": "Darwin"},
    },
]

UNREADABLE_CASES: list[ContractCase] = [
    {
        "id": "unsupported_charset",
        "input_overrides": {"payload": document("ANSI", "Anne /Darwin/").encode("ascii")},
        "expected_overrides": {
            "message": "The character set 'ANSI' is not supported; save the file as UTF-8."
        },
    },
    {
        "id": "invalid_utf8_names_the_line",
        "input_overrides": {
            "payload": document("UTF-8", "Anne /Darwin/").encode("utf-8").replace(b"Anne", b"\xc3(")
        },
        "expected_overrides": {"message": "Line 6 contains a byte that is not valid UTF-8."},
    },
    {
        "id": "non_ascii_byte_in_an_ascii_file_names_the_line",
        "input_overrides": {
            "payload": document("ASCII", "Anne /Darwin/").encode("ascii").replace(b"Anne", b"\xe9")
        },
        "expected_overrides": {"message": "Line 6 contains a byte that is not valid ASCII."},
    },
    {
        "id": "byte_outside_ansel_names_the_line",
        "input_overrides": {"payload": ansel_document(b"\x80Anne /Darwin/")},
        "expected_overrides": {"message": "Line 6 contains a byte that is not valid ANSEL."},
    },
    {
        "id": "broken_utf16_names_the_line",
        "input_overrides": {
            "payload": UTF16_LITTLE_ENDIAN_MARK
            + document("UNICODE", "Anne /Darwin/", "\r\n")
            .encode("utf-16-le")
            .replace(b"A\x00n\x00n\x00e\x00", b"\x00\xdcn\x00n\x00e\x00")
        },
        "expected_overrides": {"message": "Line 6 contains a byte that is not valid UTF-16-LE."},
    },
]


@pytest.mark.parametrize("case", DECODING_CASES, ids=case_ids(DECODING_CASES))
def test_reader_decodes_every_supported_charset(case: ContractCase) -> None:
    profile = GedcomReader().read(case["input_overrides"]["payload"]).people[0].profile
    actual = {"given_names": profile.given_names, "surname": profile.surname}
    assert actual == case["expected_overrides"]


@pytest.mark.parametrize("case", UNREADABLE_CASES, ids=case_ids(UNREADABLE_CASES))
def test_reader_rejects_undecodable_text(case: ContractCase) -> None:
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(case["input_overrides"]["payload"])
    assert (raised.value.code, raised.value.message) == (
        "gedcom.unreadable",
        case["expected_overrides"]["message"],
    )
