import pytest

from tests.adapters.gedcom.gedcom_validator import GEDCOM_7, GEDCOM_551, gedcom_problems
from tests.contract import ContractCase, case_ids

HEADER_551 = (
    "0 HEAD",
    "1 SOUR FAMILY_TREE",
    "1 SUBM @U1@",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
    "0 @U1@ SUBM",
    "1 NAME Family Tree",
)
HEADER_7 = ("0 HEAD", "1 GEDC", "2 VERS 7.0")


def gedcom551(*body: str) -> str:
    return "\n".join([*HEADER_551, *body, "0 TRLR", ""])


def gedcom7(*body: str) -> str:
    return "\ufeff" + "\n".join([*HEADER_7, *body, "0 TRLR", ""])


FAMILY = ("0 @I1@ INDI", "1 NAME Anne /Darwin/", "1 FAMC @F1@", "0 @F1@ FAM", "1 CHIL @I1@")

VALIDATOR_CASES: list[ContractCase] = [
    {
        "id": "valid_gedcom551",
        "input_overrides": {
            "text": gedcom551(
                *FAMILY, "2 CONC , no", "0 @N1@ NOTE mail@@example.com", "1 CONT @#DJULIAN@ ok"
            ),
            "rules": GEDCOM_551,
        },
        "expected_overrides": {"problems": []},
    },
    {
        "id": "valid_gedcom7_allows_long_lines_and_void_pointers",
        "input_overrides": {
            "text": gedcom7(*FAMILY, "1 WIFE @VOID@", f"1 NOTE {'x' * 300}"),
            "rules": GEDCOM_7,
        },
        "expected_overrides": {"problems": []},
    },
    {
        "id": "missing_final_terminator",
        "input_overrides": {"text": gedcom551(*FAMILY).rstrip("\n"), "rules": GEDCOM_551},
        "expected_overrides": {"problems": ["the last line has no line terminator"]},
    },
    {
        "id": "carriage_return_and_empty_line",
        "input_overrides": {"text": gedcom551("0 @I1@ INDI\r", ""), "rules": GEDCOM_551},
        "expected_overrides": {
            "problems": [
                "a carriage return is used as a line terminator",
                "line 11: empty line",
                "line 10: not 'level [@XREF@] TAG [payload]': '0 @I1@ INDI\\r'",
            ]
        },
    },
    {
        "id": "lowercase_tag_and_trailing_delimiter",
        "input_overrides": {"text": gedcom551("0 @I1@ INDI", "1 name Anne", "1 SEX "), "rules": GEDCOM_551},
        "expected_overrides": {
            "problems": [
                "line 11: not 'level [@XREF@] TAG [payload]': '1 name Anne'",
                "line 12: not 'level [@XREF@] TAG [payload]': '1 SEX '",
            ]
        },
    },
    {
        "id": "gedcom551_line_longer_than_255_characters",
        "input_overrides": {"text": gedcom551("0 @I1@ INDI", f"1 NOTE {'x' * 248}"), "rules": GEDCOM_551},
        "expected_overrides": {"problems": ["line 11: 256 characters with its terminator"]},
    },
    {
        "id": "level_jump",
        "input_overrides": {"text": gedcom551("0 @I1@ INDI", "1 BIRT", "3 DATE 1841"), "rules": GEDCOM_551},
        "expected_overrides": {"problems": ["line 12: level 3 follows level 1"]},
    },
    {
        "id": "record_problems",
        "input_overrides": {
            "text": gedcom551("0 @I1@ INDI", "0 INDI", "0 @X1@ FOOD", "0 @I1@ INDI"),
            "rules": GEDCOM_551,
        },
        "expected_overrides": {
            "problems": [
                "line 12: FOOD is not a record",
                "line 11: INDI record without xref",
                "xref @I1@ is defined 2 times",
            ]
        },
    },
    {
        "id": "missing_trailer",
        "input_overrides": {"text": gedcom551().replace("0 TRLR\n", ""), "rules": GEDCOM_551},
        "expected_overrides": {"problems": ["records must run from HEAD to TRLR"]},
    },
    {
        "id": "gedcom551_header_without_submitter",
        "input_overrides": {"text": gedcom551().replace("1 SUBM @U1@\n", ""), "rules": GEDCOM_551},
        "expected_overrides": {"problems": ["HEAD.SUBM is missing"]},
    },
    {
        "id": "gedcom7_header_with_charset_and_wrong_version",
        "input_overrides": {
            "text": gedcom7().replace("2 VERS 7.0", "2 VERS 5.5.1\n1 CHAR UTF-8"),
            "rules": GEDCOM_7,
        },
        "expected_overrides": {"problems": ["HEAD.CHAR is not allowed", "HEAD.GEDC.VERS is 5.5.1, not 7.0"]},
    },
    {
        "id": "pointer_problems",
        "input_overrides": {
            "text": gedcom551(*FAMILY, "1 HUSB Charles", "0 @I2@ INDI", "1 FAMS @F9@", "1 FAMC @I1@"),
            "rules": GEDCOM_551,
        },
        "expected_overrides": {
            "problems": [
                "line 15: HUSB 'Charles' is not a pointer",
                "line 17: FAMS '@F9@' points to nothing",
                "line 18: FAMC '@I1@' points to a INDI record instead of FAM",
            ]
        },
    },
    {
        "id": "continuation_problems",
        "input_overrides": {
            "text": gedcom551(
                "0 @I1@ INDI",
                "1 NOTE a",
                "2 SOUR @S1@",
                "2 CONT b",
                "3 DATA",
                "1 NOTE c ",
                "2 CONC d",
                "2 @X1@ CONT e",
            ).replace("0 TRLR", "0 @S1@ SOUR\n0 TRLR"),
            "rules": GEDCOM_551,
        },
        "expected_overrides": {
            "problems": [
                "line 13: it does not directly follow the line it continues",
                "line 14: a continuation line has substructures",
                "line 16: it splits the text next to a space",
                "line 17: it has an xref",
            ]
        },
    },
    {
        "id": "gedcom7_has_no_conc",
        "input_overrides": {"text": gedcom7("0 @I1@ INDI", "1 NOTE a", "2 CONC b"), "rules": GEDCOM_7},
        "expected_overrides": {"problems": ["line 6: CONC is not part of GEDCOM 7.0"]},
    },
    {
        "id": "enumeration_problems",
        "input_overrides": {
            "text": gedcom7("0 @I1@ INDI", "1 SEX Q", "1 FAMC @F1@", "2 PEDI adopted", "0 @F1@ FAM"),
            "rules": GEDCOM_7,
        },
        "expected_overrides": {
            "problems": [
                "line 5: SEX 'Q' is not one of ['F', 'M', 'U', 'X']",
                "line 7: PEDI 'adopted' is not one of ['ADOPTED', 'BIRTH', 'FOSTER', 'OTHER', 'SEALING']",
            ]
        },
    },
    {
        "id": "gedcom551_lone_at_sign",
        "input_overrides": {"text": gedcom551("0 @I1@ INDI", "1 NOTE mail@example.com"), "rules": GEDCOM_551},
        "expected_overrides": {"problems": ["line 11: unescaped @ in 'mail@example.com'"]},
    },
    {
        "id": "gedcom7_unescaped_leading_at_sign",
        "input_overrides": {
            "text": gedcom7("0 @I1@ INDI", "1 NOTE @home", "2 CONT mail@example.com"),
            "rules": GEDCOM_7,
        },
        "expected_overrides": {"problems": ["line 5: unescaped @ in '@home'"]},
    },
]


@pytest.mark.parametrize("case", VALIDATOR_CASES, ids=case_ids(VALIDATOR_CASES))
def test_validator_finds_exactly_the_structural_problems(case: ContractCase) -> None:
    problems = gedcom_problems(case["input_overrides"]["text"], case["input_overrides"]["rules"])
    assert problems == case["expected_overrides"]["problems"]
