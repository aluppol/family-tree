from collections.abc import Mapping

import pytest

from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.enums import DateQualifier, ParentLinkKind, PartnershipEndReason, PartnershipKind, Sex
from family_tree.domain.interchange import InterchangeDocument
from family_tree.domain.people import LifeEvent
from family_tree.domain.relationships import PartnershipEnd, PartnershipTerms
from tests.adapters.gedcom.builders import between, exact, gedcom_bytes, qualified
from tests.contract import ContractCase, case_ids

ABSENT = "<absent>"
PROFILE_FIELDS = ("given_names", "surname", "sex", "birth", "death", "biography")
HEAD_551 = "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n2 FORM LINEAGE-LINKED\n1 CHAR UTF-8"
HEAD_7 = "0 HEAD\n1 GEDC\n2 VERS 7.0"
BIRTH = ParentLinkKind.BIRTH
MARRIED_AT_MAER = PartnershipTerms(
    kind=PartnershipKind.MARRIAGE, start=LifeEvent(date=exact(1839, 1, 29), place="Maer")
)
UNMARRIED = PartnershipTerms(kind=PartnershipKind.PARTNERSHIP, start=LifeEvent())
WILLIAM_LINKS = (("@I1@", "@I3@", BIRTH), ("@I2@", "@I3@", BIRTH))
NOT_A_DATE = "is not a date like '12 FEB 1809', 'FEB 1809' or '1809'."
PHOTOS_NEED_GEDZIP = "Photos need a GEDZIP file."


def record(*lines: str) -> str:
    return "\n".join(lines)


def subject(*lines: str) -> dict[str, str | None]:
    return {"@I4@": record("0 @I4@ INDI", *lines)}


def named_subject(*lines: str) -> dict[str, str | None]:
    return subject("1 NAME Anne /Darwin/", *lines)


def marriage(*lines: str) -> dict[str, str | None]:
    return {"@F1@": record("0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I3@", *lines)}


def william(*lines: str) -> dict[str, str | None]:
    return {"@I3@": record("0 @I3@ INDI", "1 NAME William Erasmus /Darwin/", "1 SEX M", *lines)}


def person_fields(
    key: str,
    *,
    given_names: str,
    surname: str,
    sex: Sex = Sex.UNKNOWN,
    birth: LifeEvent | None = None,
    death: LifeEvent | None = None,
    biography: str = "",
    photo: object = None,
) -> dict[str, object]:
    values = (given_names, surname, sex, birth or LifeEvent(), death, biography, photo)
    return {
        f"people.{key}.{field}": value
        for field, value in zip((*PROFILE_FIELDS, "photo"), values, strict=True)
    }


def expected_subject(**fields: object) -> dict[str, object]:
    overrides = {f"people.@I4@.{field}": value for field, value in fields.items()}
    return {**person_fields("@I4@", given_names="Anne", surname="Darwin"), **overrides}


def absent_person(key: str) -> dict[str, object]:
    return {f"people.{key}.{field}": ABSENT for field in (*PROFILE_FIELDS, "photo")}


def links(*triples: tuple[str, str, ParentLinkKind]) -> tuple[tuple[str, str, ParentLinkKind], ...]:
    return tuple(sorted(triples))


def skipped(*pairs: tuple[str, str]) -> tuple[tuple[str, str], ...]:
    return pairs


def undated(text: str, explanation: str) -> str:
    return f"The date '{text}' is not imported. {explanation}"


def _base_input() -> dict[str, str | None]:
    return {
        "HEAD": HEAD_551,
        "@I1@": record(
            "0 @I1@ INDI",
            "1 NAME Charles Robert /Darwin/",
            "1 SEX M",
            "1 BIRT",
            "2 DATE 12 FEB 1809",
            "2 PLAC Shrewsbury",
            "1 DEAT",
            "2 DATE 19 APR 1882",
            "2 PLAC Downe",
            "1 FAMS @F1@",
        ),
        "@I2@": record("0 @I2@ INDI", "1 NAME Emma /Wedgwood/", "1 SEX F", "1 FAMS @F1@"),
        **william("1 FAMC @F1@"),
        **marriage("1 MARR", "2 DATE 29 JAN 1839", "2 PLAC Maer"),
        "TRLR": "0 TRLR",
    }


def _base_expected() -> dict[str, object]:
    return {
        **person_fields(
            "@I1@",
            given_names="Charles Robert",
            surname="Darwin",
            sex=Sex.MALE,
            birth=LifeEvent(date=exact(1809, 2, 12), place="Shrewsbury"),
            death=LifeEvent(date=exact(1882, 4, 19), place="Downe"),
        ),
        **person_fields("@I2@", given_names="Emma", surname="Wedgwood", sex=Sex.FEMALE),
        **person_fields("@I3@", given_names="William Erasmus", surname="Darwin", sex=Sex.MALE),
        "parent_links": links(*WILLIAM_LINKS),
        "partnerships": (("@I1@", "@I2@", MARRIED_AT_MAER),),
        "skipped": (),
    }


def _payload(records: Mapping[str, str | None]) -> bytes:
    present = {label: text for label, text in records.items() if text is not None}
    head, trailer = present.pop("HEAD"), present.pop("TRLR")
    return gedcom_bytes(head, *present.values(), trailer)


ADDED_RECORD_LINE = _payload(_base_input()).count(b"\n")

PERSON_CASES: list[ContractCase] = [
    {
        "id": "name_value_splits_given_names_and_surname",
        "input_overrides": subject("1 NAME Anne Elizabeth /Darwin/"),
        "expected_overrides": expected_subject(given_names="Anne Elizabeth"),
    },
    {
        "id": "name_suffix_after_the_surname_joins_the_surname",
        "input_overrides": subject("1 NAME John /Kennedy/ Jr."),
        "expected_overrides": expected_subject(given_names="John", surname="Kennedy Jr."),
    },
    {
        "id": "name_with_the_surname_first_keeps_the_rest_as_given_names",
        "input_overrides": subject("1 NAME /Darwin/ Anne"),
        "expected_overrides": expected_subject(),
    },
    {
        "id": "name_without_slashes_is_all_given_names",
        "input_overrides": subject("1 NAME Anne Darwin"),
        "expected_overrides": expected_subject(given_names="Anne Darwin", surname=""),
    },
    {
        "id": "name_pieces_win_over_the_name_value",
        "input_overrides": subject("1 NAME Annie /Darwyn/", "2 GIVN Anne", "2 SURN Darwin"),
        "expected_overrides": expected_subject(),
    },
    {
        "id": "surname_prefix_piece_joins_the_surname_piece",
        "input_overrides": subject("1 NAME Vincent /van Gogh/", "2 SPFX van", "2 SURN Gogh"),
        "expected_overrides": expected_subject(given_names="Vincent", surname="van Gogh"),
    },
    {
        "id": "name_suffix_piece_joins_the_surname",
        "input_overrides": subject("1 NAME Anne /Darwin/", "2 NSFX II"),
        "expected_overrides": expected_subject(surname="Darwin II"),
    },
    {
        "id": "name_pieces_win_even_when_given_names_contain_a_slash",
        "input_overrides": subject(
            "1 NAME Jean/Paul /Sartre/", "2 GIVN Jean/Paul", "2 SURN Sartre", "2 NSFX Jr."
        ),
        "expected_overrides": expected_subject(given_names="Jean/Paul", surname="Sartre Jr."),
    },
    {
        "id": "suffix_piece_replaces_the_suffix_in_the_name_value",
        "input_overrides": subject("1 NAME John /Kennedy/ Jr.", "2 NSFX Jr."),
        "expected_overrides": expected_subject(given_names="John", surname="Kennedy Jr."),
    },
    {
        "id": "missing_name_imports_the_person_as_unknown",
        "input_overrides": subject("1 SEX F"),
        "expected_overrides": {
            **expected_subject(given_names="Unknown", surname="", sex=Sex.FEMALE),
            "skipped": skipped(("@I4@ NAME", "The person has no name, so they are imported as 'Unknown'.")),
        },
    },
    {
        "id": "empty_name_imports_the_person_as_unknown",
        "input_overrides": subject("1 NAME //"),
        "expected_overrides": {
            **expected_subject(given_names="Unknown", surname=""),
            "skipped": skipped(("@I4@ NAME", "The person has no name, so they are imported as 'Unknown'.")),
        },
    },
    {
        "id": "only_the_first_name_is_imported",
        "input_overrides": subject("1 NAME Anne /Darwin/", "1 NAME Annie /Darwin/"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("@I4@ NAME", "Only the first name is imported; 'Annie /Darwin/' is skipped.")
            ),
        },
    },
    {
        "id": "long_name_parts_are_shortened",
        "input_overrides": subject(f"1 NAME {'A' * 130} /Darwin/"),
        "expected_overrides": {
            **expected_subject(given_names="A" * 120),
            "skipped": skipped(("@I4@ NAME", "The name is shortened to 120 characters per part.")),
        },
    },
    {
        "id": "sex_x_is_other",
        "input_overrides": named_subject("1 SEX X"),
        "expected_overrides": expected_subject(sex=Sex.OTHER),
    },
    {
        "id": "sex_u_is_unknown",
        "input_overrides": named_subject("1 SEX U"),
        "expected_overrides": expected_subject(sex=Sex.UNKNOWN),
    },
    {
        "id": "sex_code_is_case_insensitive",
        "input_overrides": named_subject("1 SEX f"),
        "expected_overrides": expected_subject(sex=Sex.FEMALE),
    },
    {
        "id": "unrecognised_sex_code_is_unknown",
        "input_overrides": named_subject("1 SEX N"),
        "expected_overrides": expected_subject(sex=Sex.UNKNOWN),
    },
    {
        "id": "missing_sex_is_unknown",
        "input_overrides": named_subject(),
        "expected_overrides": expected_subject(sex=Sex.UNKNOWN),
    },
    {
        "id": "birth_date_and_place",
        "input_overrides": named_subject("1 BIRT", "2 DATE 2 MAR 1841", "2 PLAC Down House"),
        "expected_overrides": expected_subject(birth=LifeEvent(date=exact(1841, 3, 2), place="Down House")),
    },
    {
        "id": "death_asserted_with_y_is_deceased_without_details",
        "input_overrides": named_subject("1 DEAT Y"),
        "expected_overrides": expected_subject(death=LifeEvent()),
    },
    {
        "id": "christening_date_bounds_a_missing_birth_date",
        "input_overrides": named_subject("1 CHR", "2 DATE 5 APR 1841", "2 PLAC Downe"),
        "expected_overrides": {
            **expected_subject(birth=LifeEvent(date=qualified(DateQualifier.BEFORE, 1841, 4, 5))),
            "skipped": skipped(("INDI.CHR", "1 christening fact is not imported.")),
        },
    },
    {
        "id": "baptism_date_bounds_a_birth_without_date",
        "input_overrides": named_subject("1 BIRT", "2 PLAC Downe", "1 BAPM", "2 DATE ABT 1841"),
        "expected_overrides": {
            **expected_subject(birth=LifeEvent(date=qualified(DateQualifier.BEFORE, 1841), place="Downe")),
            "skipped": skipped(("INDI.BAPM", "1 baptism fact is not imported.")),
        },
    },
    {
        "id": "birth_date_wins_over_the_christening_date",
        "input_overrides": named_subject("1 BIRT", "2 DATE 2 MAR 1841", "1 CHR", "2 DATE 5 APR 1841"),
        "expected_overrides": {
            **expected_subject(birth=LifeEvent(date=exact(1841, 3, 2))),
            "skipped": skipped(("INDI.CHR", "1 christening fact is not imported.")),
        },
    },
    {
        "id": "christening_after_a_date_gives_no_birth_bound",
        "input_overrides": named_subject("1 CHR", "2 DATE AFT 1841"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(("INDI.CHR", "1 christening fact is not imported.")),
        },
    },
    {
        "id": "christening_range_bounds_the_birth_by_its_end",
        "input_overrides": named_subject("1 CHR", "2 DATE BET 1840 AND 1842", "1 CHR", "2 DATE 1845"),
        "expected_overrides": {
            **expected_subject(birth=LifeEvent(date=qualified(DateQualifier.BEFORE, 1842))),
            "skipped": skipped(("INDI.CHR", "2 christening facts are not imported.")),
        },
    },
    {
        "id": "unreadable_christening_date_gives_no_birth_bound",
        "input_overrides": named_subject("1 CHR", "2 DATE Spring 1841"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(("INDI.CHR", "1 christening fact is not imported.")),
        },
    },
    {
        "id": "burial_marks_the_person_deceased_before_it",
        "input_overrides": named_subject("1 BURI", "2 DATE 26 APR 1882", "2 PLAC Westminster Abbey"),
        "expected_overrides": {
            **expected_subject(death=LifeEvent(date=qualified(DateQualifier.BEFORE, 1882, 4, 26))),
            "skipped": skipped(("INDI.BURI", "1 burial fact is not imported.")),
        },
    },
    {
        "id": "burial_without_date_marks_the_person_deceased",
        "input_overrides": named_subject("1 BURI Y"),
        "expected_overrides": {
            **expected_subject(death=LifeEvent()),
            "skipped": skipped(("INDI.BURI", "1 burial fact is not imported.")),
        },
    },
    {
        "id": "cremation_marks_the_person_deceased_before_it",
        "input_overrides": named_subject("1 CREM", "2 DATE 1901"),
        "expected_overrides": {
            **expected_subject(death=LifeEvent(date=qualified(DateQualifier.BEFORE, 1901))),
            "skipped": skipped(("INDI.CREM", "1 cremation fact is not imported.")),
        },
    },
    {
        "id": "death_without_date_takes_the_burial_bound",
        "input_overrides": named_subject("1 DEAT", "2 PLAC Downe", "1 BURI", "2 DATE 1882"),
        "expected_overrides": {
            **expected_subject(death=LifeEvent(date=qualified(DateQualifier.BEFORE, 1882), place="Downe")),
            "skipped": skipped(("INDI.BURI", "1 burial fact is not imported.")),
        },
    },
    {
        "id": "death_date_wins_over_the_burial_date",
        "input_overrides": named_subject("1 DEAT", "2 DATE 19 APR 1882", "1 BURI", "2 DATE 26 APR 1882"),
        "expected_overrides": {
            **expected_subject(death=LifeEvent(date=exact(1882, 4, 19))),
            "skipped": skipped(("INDI.BURI", "1 burial fact is not imported.")),
        },
    },
    {
        "id": "long_place_is_shortened",
        "input_overrides": named_subject("1 BIRT", f"2 PLAC {'x' * 210}"),
        "expected_overrides": {
            **expected_subject(birth=LifeEvent(place="x" * 200)),
            "skipped": skipped(("@I4@ BIRT PLAC", "The place is shortened to 200 characters.")),
        },
    },
]

DATE_CASES: list[ContractCase] = [
    {
        "id": "about_and_between_dates",
        "input_overrides": named_subject("1 BIRT", "2 DATE ABT 1841", "1 DEAT", "2 DATE BET 1880 AND 1885"),
        "expected_overrides": expected_subject(
            birth=LifeEvent(date=qualified(DateQualifier.ABOUT, 1841)),
            death=LifeEvent(date=between(1880, 1885)),
        ),
    },
    {
        "id": "calculated_and_estimated_dates",
        "input_overrides": named_subject("1 BIRT", "2 DATE CAL MAR 1841", "1 DEAT", "2 DATE EST 1900"),
        "expected_overrides": expected_subject(
            birth=LifeEvent(date=qualified(DateQualifier.CALCULATED, 1841, 3)),
            death=LifeEvent(date=qualified(DateQualifier.ESTIMATED, 1900)),
        ),
    },
    {
        "id": "before_and_after_dates",
        "input_overrides": named_subject("1 BIRT", "2 DATE BEF 1841", "1 DEAT", "2 DATE AFT 1900"),
        "expected_overrides": expected_subject(
            birth=LifeEvent(date=qualified(DateQualifier.BEFORE, 1841)),
            death=LifeEvent(date=qualified(DateQualifier.AFTER, 1900)),
        ),
    },
    {
        "id": "dual_year_takes_the_new_style_year",
        "input_overrides": named_subject("1 BIRT", "2 DATE 11 FEB 1731/32"),
        "expected_overrides": expected_subject(birth=LifeEvent(date=exact(1732, 2, 11))),
    },
    {
        "id": "explicit_gregorian_calendar_is_accepted",
        "input_overrides": named_subject("1 BIRT", "2 DATE @#DGREGORIAN@ 12 FEB 1809"),
        "expected_overrides": expected_subject(birth=LifeEvent(date=exact(1809, 2, 12))),
    },
    {
        "id": "month_names_are_case_insensitive",
        "input_overrides": named_subject("1 BIRT", "2 DATE 2 mar  1841"),
        "expected_overrides": expected_subject(birth=LifeEvent(date=exact(1841, 3, 2))),
    },
    {
        "id": "empty_date_is_no_date",
        "input_overrides": named_subject("1 BIRT", "2 DATE", "2 PLAC Downe"),
        "expected_overrides": expected_subject(birth=LifeEvent(place="Downe")),
    },
    {
        "id": "period_is_reported_and_left_empty",
        "input_overrides": named_subject("1 BIRT", "2 DATE FROM 1840 TO 1845", "2 PLAC Downe"),
        "expected_overrides": {
            **expected_subject(birth=LifeEvent(place="Downe")),
            "skipped": skipped(
                ("@I4@ BIRT DATE", undated("FROM 1840 TO 1845", "Periods (FROM, TO) are not supported."))
            ),
        },
    },
    {
        "id": "interpreted_date_is_reported",
        "input_overrides": named_subject("1 BIRT", "2 DATE INT 1841 (from the census)"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                (
                    "@I4@ BIRT DATE",
                    undated(
                        "INT 1841 (from the census)", "Interpreted dates and date phrases are not supported."
                    ),
                )
            ),
        },
    },
    {
        "id": "date_phrase_is_reported",
        "input_overrides": named_subject("1 BIRT", "2 DATE (spring of 1841)"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                (
                    "@I4@ BIRT DATE",
                    undated("(spring of 1841)", "Interpreted dates and date phrases are not supported."),
                )
            ),
        },
    },
    {
        "id": "julian_calendar_escape_is_reported",
        "input_overrides": named_subject("1 BIRT", "2 DATE @#DJULIAN@ 1 MAR 1700"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("@I4@ BIRT DATE", undated("@#DJULIAN@ 1 MAR 1700", "Only Gregorian dates are supported."))
            ),
        },
    },
    {
        "id": "gedcom7_julian_calendar_is_reported",
        "input_overrides": {"HEAD": HEAD_7, **named_subject("1 BIRT", "2 DATE JULIAN 1 MAR 1700")},
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("@I4@ BIRT DATE", undated("JULIAN 1 MAR 1700", "Only Gregorian dates are supported."))
            ),
        },
    },
    {
        "id": "date_before_the_year_one_is_reported",
        "input_overrides": named_subject("1 BIRT", "2 DATE 44 B.C."),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("@I4@ BIRT DATE", undated("44 B.C.", "Dates before the year 1 are not supported."))
            ),
        },
    },
    {
        "id": "impossible_date_is_reported",
        "input_overrides": named_subject("1 BIRT", "2 DATE 31 FEB 1841"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("@I4@ BIRT DATE", undated("31 FEB 1841", "Day 31 does not exist in 1841-02."))
            ),
        },
    },
    {
        "id": "unrecognised_date_is_reported",
        "input_overrides": named_subject("1 DEAT", "2 DATE Spring 1882"),
        "expected_overrides": {
            **expected_subject(death=LifeEvent()),
            "skipped": skipped(("@I4@ DEAT DATE", undated("Spring 1882", f"'SPRING 1882' {NOT_A_DATE}"))),
        },
    },
    {
        "id": "gedcom7_date_phrase_substructure_is_ignored",
        "input_overrides": {"HEAD": HEAD_7, **named_subject("1 BIRT", "2 DATE 1841", "3 PHRASE Early 1841")},
        "expected_overrides": expected_subject(birth=LifeEvent(date=exact(1841))),
    },
]

NOTE_CASES: list[ContractCase] = [
    {
        "id": "inline_note_becomes_the_biography",
        "input_overrides": named_subject("1 NOTE Loved beetles."),
        "expected_overrides": expected_subject(biography="Loved beetles."),
    },
    {
        "id": "note_continuations_are_joined",
        "input_overrides": named_subject("1 NOTE First line", "2 CONC , same line", "2 CONT Second line"),
        "expected_overrides": expected_subject(biography="First line, same line\nSecond line"),
    },
    {
        "id": "shared_note_is_resolved",
        "input_overrides": {
            **named_subject("1 NOTE @N1@"),
            "@N1@": record("0 @N1@ NOTE Shared text", "1 CONT more"),
        },
        "expected_overrides": expected_subject(biography="Shared text\nmore"),
    },
    {
        "id": "several_notes_are_joined_by_a_blank_line",
        "input_overrides": named_subject("1 NOTE One", "1 NOTE", "1 NOTE Two"),
        "expected_overrides": expected_subject(biography="One\n\nTwo"),
    },
    {
        "id": "missing_shared_note_is_reported",
        "input_overrides": named_subject("1 NOTE @N9@", "1 NOTE Kept"),
        "expected_overrides": {
            **expected_subject(biography="Kept"),
            "skipped": skipped(
                ("@I4@ NOTE", "@N9@ does not point to a note in this file, so the link is skipped.")
            ),
        },
    },
    {
        "id": "long_biography_is_shortened",
        "input_overrides": named_subject(f"1 NOTE {'x' * 10_005}"),
        "expected_overrides": {
            **expected_subject(biography="x" * 10_000),
            "skipped": skipped(("@I4@ NOTE", "The notes are shortened to 10,000 characters.")),
        },
    },
    {
        "id": "gedcom7_shared_note_is_resolved",
        "input_overrides": {"HEAD": HEAD_7, **named_subject("1 SNOTE @N1@"), "@N1@": "0 @N1@ SNOTE Shared"},
        "expected_overrides": expected_subject(biography="Shared"),
    },
    {
        "id": "gedcom7_void_note_pointer_is_ignored",
        "input_overrides": {"HEAD": HEAD_7, **named_subject("1 SNOTE @VOID@")},
        "expected_overrides": expected_subject(),
    },
    {
        "id": "gedcom551_doubled_at_signs_are_unescaped_everywhere",
        "input_overrides": named_subject("1 NOTE @@home: anne@@darwin.example"),
        "expected_overrides": expected_subject(biography="@home: anne@darwin.example"),
    },
    {
        "id": "gedcom7_unescapes_only_a_leading_doubled_at_sign",
        "input_overrides": {"HEAD": HEAD_7, **named_subject("1 NOTE @@home: anne@@darwin.example")},
        "expected_overrides": expected_subject(biography="@home: anne@@darwin.example"),
    },
    {
        "id": "gedcom7_has_no_conc_continuation",
        "input_overrides": {"HEAD": HEAD_7, **named_subject("1 NOTE One", "2 CONC Two")},
        "expected_overrides": {
            **expected_subject(biography="One"),
            "skipped": skipped(("INDI.NOTE.CONC", "1 CONC entry is not imported.")),
        },
    },
    {
        "id": "header_without_version_reads_as_gedcom551",
        "input_overrides": {"HEAD": "0 HEAD", **named_subject("1 NOTE One", "2 CONC Two")},
        "expected_overrides": expected_subject(biography="OneTwo"),
    },
]

FAMILY_CASES: list[ContractCase] = [
    {
        "id": "family_without_marriage_is_a_partnership",
        "input_overrides": marriage(),
        "expected_overrides": {"partnerships": (("@I1@", "@I2@", UNMARRIED),)},
    },
    {
        "id": "marriage_asserted_with_y_has_no_details",
        "input_overrides": marriage("1 MARR Y"),
        "expected_overrides": {
            "partnerships": (
                ("@I1@", "@I2@", PartnershipTerms(kind=PartnershipKind.MARRIAGE, start=LifeEvent())),
            )
        },
    },
    {
        "id": "divorce_ends_the_marriage",
        "input_overrides": marriage("1 MARR Y", "1 DIV", "2 DATE 1850"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.MARRIAGE,
                        start=LifeEvent(),
                        end=PartnershipEnd(reason=PartnershipEndReason.DIVORCE, date=exact(1850)),
                    ),
                ),
            )
        },
    },
    {
        "id": "divorce_without_date",
        "input_overrides": marriage("1 DIV Y"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.PARTNERSHIP,
                        start=LifeEvent(),
                        end=PartnershipEnd(reason=PartnershipEndReason.DIVORCE),
                    ),
                ),
            )
        },
    },
    {
        "id": "annulment_ends_the_marriage",
        "input_overrides": marriage("1 MARR", "2 DATE 29 JAN 1839", "2 PLAC Maer", "1 ANUL", "2 DATE 1840"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.MARRIAGE,
                        start=MARRIED_AT_MAER.start,
                        end=PartnershipEnd(reason=PartnershipEndReason.ANNULMENT, date=exact(1840)),
                    ),
                ),
            )
        },
    },
    {
        "id": "separation_event_ends_the_partnership",
        "input_overrides": marriage("1 EVEN", "2 TYPE Separation", "2 DATE 1845"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.PARTNERSHIP,
                        start=LifeEvent(),
                        end=PartnershipEnd(reason=PartnershipEndReason.SEPARATION, date=exact(1845)),
                    ),
                ),
            )
        },
    },
    {
        "id": "separation_type_is_case_insensitive",
        "input_overrides": marriage("1 EVEN Separated", "2 TYPE separated"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.PARTNERSHIP,
                        start=LifeEvent(),
                        end=PartnershipEnd(reason=PartnershipEndReason.SEPARATION),
                    ),
                ),
            )
        },
    },
    {
        "id": "divorce_takes_precedence_over_separation",
        "input_overrides": marriage("1 EVEN", "2 TYPE Separation", "2 DATE 1845", "1 DIV", "2 DATE 1850"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.PARTNERSHIP,
                        start=LifeEvent(),
                        end=PartnershipEnd(reason=PartnershipEndReason.DIVORCE, date=exact(1850)),
                    ),
                ),
            )
        },
    },
    {
        "id": "partnership_event_starts_an_unmarried_partnership",
        "input_overrides": marriage(
            "1 EVEN Partnership", "2 TYPE Partnership", "2 DATE 1835", "2 PLAC London"
        ),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.PARTNERSHIP, start=LifeEvent(date=exact(1835), place="London")
                    ),
                ),
            )
        },
    },
    {
        "id": "other_family_events_are_counted",
        "input_overrides": marriage(
            "1 MARR", "2 DATE 29 JAN 1839", "2 PLAC Maer", "1 EVEN", "2 TYPE Honeymoon"
        ),
        "expected_overrides": {"skipped": skipped(("FAM.EVEN", "1 other family event is not imported."))},
    },
    {
        "id": "marriage_date_problem_is_reported",
        "input_overrides": marriage("1 MARR", "2 DATE FROM 1839 TO 1840", "2 PLAC Maer"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(kind=PartnershipKind.MARRIAGE, start=LifeEvent(place="Maer")),
                ),
            ),
            "skipped": skipped(
                ("@F1@ MARR DATE", undated("FROM 1839 TO 1840", "Periods (FROM, TO) are not supported."))
            ),
        },
    },
    {
        "id": "partnership_start_date_problem_is_reported",
        "input_overrides": marriage("1 EVEN", "2 TYPE Partnership", "2 DATE 1835/1836"),
        "expected_overrides": {
            "partnerships": (("@I1@", "@I2@", UNMARRIED),),
            "skipped": skipped(("@F1@ EVEN DATE", undated("1835/1836", f"'1835/1836' {NOT_A_DATE}"))),
        },
    },
    {
        "id": "divorce_date_problem_is_reported",
        "input_overrides": marriage("1 MARR Y", "1 DIV", "2 DATE 31 FEB 1850"),
        "expected_overrides": {
            "partnerships": (
                (
                    "@I1@",
                    "@I2@",
                    PartnershipTerms(
                        kind=PartnershipKind.MARRIAGE,
                        start=LifeEvent(),
                        end=PartnershipEnd(reason=PartnershipEndReason.DIVORCE),
                    ),
                ),
            ),
            "skipped": skipped(
                ("@F1@ DIV DATE", undated("31 FEB 1850", "Day 31 does not exist in 1850-02."))
            ),
        },
    },
]

MEMBERSHIP_CASES: list[ContractCase] = [
    {
        "id": "single_parent_family_links_without_a_partnership",
        "input_overrides": {"@F1@": record("0 @F1@ FAM", "1 WIFE @I2@", "1 CHIL @I3@", "1 MARR Y")},
        "expected_overrides": {"parent_links": links(("@I2@", "@I3@", BIRTH)), "partnerships": ()},
    },
    {
        "id": "missing_partner_is_reported_and_the_rest_is_kept",
        "input_overrides": {"@F1@": record("0 @F1@ FAM", "1 HUSB @I99@", "1 WIFE @I2@", "1 CHIL @I3@")},
        "expected_overrides": {
            "parent_links": links(("@I2@", "@I3@", BIRTH)),
            "partnerships": (),
            "skipped": skipped(
                ("@F1@ HUSB", "@I99@ does not point to a person in this file, so the link is skipped.")
            ),
        },
    },
    {
        "id": "family_pointing_at_a_removed_individual_keeps_the_rest",
        "input_overrides": {"@I2@": None},
        "expected_overrides": {
            **absent_person("@I2@"),
            "parent_links": links(("@I1@", "@I3@", BIRTH)),
            "partnerships": (),
            "skipped": skipped(
                ("@F1@ WIFE", "@I2@ does not point to a person in this file, so the link is skipped.")
            ),
        },
    },
    {
        "id": "missing_child_is_reported",
        "input_overrides": marriage("1 CHIL @I98@", "1 MARR", "2 DATE 29 JAN 1839", "2 PLAC Maer"),
        "expected_overrides": {
            "skipped": skipped(
                ("@F1@ CHIL", "@I98@ does not point to a person in this file, so the link is skipped.")
            )
        },
    },
    {
        "id": "pointer_to_a_family_instead_of_a_person_is_reported",
        "input_overrides": marriage("1 CHIL @F1@", "1 MARR", "2 DATE 29 JAN 1839", "2 PLAC Maer"),
        "expected_overrides": {
            "skipped": skipped(
                ("@F1@ CHIL", "@F1@ does not point to a person in this file, so the link is skipped.")
            )
        },
    },
    {
        "id": "partner_written_as_text_is_reported",
        "input_overrides": {
            "@F1@": record("0 @F1@ FAM", "1 HUSB Charles Darwin", "1 WIFE @I2@", "1 CHIL @I3@")
        },
        "expected_overrides": {
            "parent_links": links(("@I2@", "@I3@", BIRTH)),
            "partnerships": (),
            "skipped": skipped(
                (
                    "@F1@ HUSB",
                    "'Charles Darwin' does not point to a person in this file, so the link is skipped.",
                )
            ),
        },
    },
    {
        "id": "gedcom7_void_partner_is_ignored",
        "input_overrides": {
            "HEAD": HEAD_7,
            "@F1@": record("0 @F1@ FAM", "1 HUSB @VOID@", "1 WIFE @I2@", "1 CHIL @I3@"),
        },
        "expected_overrides": {"parent_links": links(("@I2@", "@I3@", BIRTH)), "partnerships": ()},
    },
    {
        "id": "child_listed_twice_is_linked_once",
        "input_overrides": marriage("1 CHIL @I3@", "1 MARR", "2 DATE 29 JAN 1839", "2 PLAC Maer"),
        "expected_overrides": {},
    },
    {
        "id": "adopted_pedigree",
        "input_overrides": william("1 FAMC @F1@", "2 PEDI adopted"),
        "expected_overrides": {
            "parent_links": links(
                ("@I1@", "@I3@", ParentLinkKind.ADOPTED), ("@I2@", "@I3@", ParentLinkKind.ADOPTED)
            )
        },
    },
    {
        "id": "foster_pedigree",
        "input_overrides": william("1 FAMC @F1@", "2 PEDI foster"),
        "expected_overrides": {
            "parent_links": links(
                ("@I1@", "@I3@", ParentLinkKind.FOSTER), ("@I2@", "@I3@", ParentLinkKind.FOSTER)
            )
        },
    },
    {
        "id": "sealing_pedigree_is_other",
        "input_overrides": william("1 FAMC @F1@", "2 PEDI sealing"),
        "expected_overrides": {
            "parent_links": links(
                ("@I1@", "@I3@", ParentLinkKind.OTHER), ("@I2@", "@I3@", ParentLinkKind.OTHER)
            )
        },
    },
    {
        "id": "unrecognised_pedigree_is_other",
        "input_overrides": william("1 FAMC @F1@", "2 PEDI step"),
        "expected_overrides": {
            "parent_links": links(
                ("@I1@", "@I3@", ParentLinkKind.OTHER), ("@I2@", "@I3@", ParentLinkKind.OTHER)
            )
        },
    },
    {
        "id": "gedcom7_uppercase_pedigree",
        "input_overrides": {
            "HEAD": HEAD_7,
            **william("1 FAMC @F1@", "2 PEDI ADOPTED", "3 PHRASE Adopted 1850"),
        },
        "expected_overrides": {
            "parent_links": links(
                ("@I1@", "@I3@", ParentLinkKind.ADOPTED), ("@I2@", "@I3@", ParentLinkKind.ADOPTED)
            )
        },
    },
    {
        "id": "explicit_birth_pedigree",
        "input_overrides": william("1 FAMC @F1@", "2 PEDI birth"),
        "expected_overrides": {},
    },
    {
        "id": "child_without_a_family_link_is_a_birth_child",
        "input_overrides": william(),
        "expected_overrides": {},
    },
    {
        "id": "pedigree_of_another_family_does_not_apply",
        "input_overrides": william("1 FAMC @F2@", "2 PEDI adopted", "1 FAMC @F1@"),
        "expected_overrides": {},
    },
    {
        "id": "second_marriage_is_a_second_partnership",
        "input_overrides": {
            "@I5@": record("0 @I5@ INDI", "1 NAME Elizabeth /Pole/", "1 SEX F", "1 FAMS @F2@"),
            "@F2@": record("0 @F2@ FAM", "1 HUSB @I1@", "1 WIFE @I5@", "1 MARR", "2 DATE 6 MAR 1781"),
        },
        "expected_overrides": {
            **person_fields("@I5@", given_names="Elizabeth", surname="Pole", sex=Sex.FEMALE),
            "partnerships": (
                ("@I1@", "@I2@", MARRIED_AT_MAER),
                (
                    "@I1@",
                    "@I5@",
                    PartnershipTerms(kind=PartnershipKind.MARRIAGE, start=LifeEvent(date=exact(1781, 3, 6))),
                ),
            ),
        },
    },
    {
        "id": "repeated_individual_identifier_is_reported",
        "input_overrides": {"repeated @I3@": record("0 @I3@ INDI", "1 NAME Someone /Else/")},
        "expected_overrides": {
            "skipped": skipped(
                ("@I3@", f"Line {ADDED_RECORD_LINE} repeats the identifier @I3@, so that record is skipped.")
            )
        },
    },
    {
        "id": "repeated_family_identifier_is_reported",
        "input_overrides": {"repeated @F1@": record("0 @F1@ FAM", "1 HUSB @I3@")},
        "expected_overrides": {
            "skipped": skipped(
                ("@F1@", f"Line {ADDED_RECORD_LINE} repeats the identifier @F1@, so that record is skipped.")
            )
        },
    },
    {
        "id": "individual_without_identifier_is_keyed_by_its_line",
        "input_overrides": {"unreferenced": record("0 INDI", "1 NAME Anne /Darwin/")},
        "expected_overrides": person_fields(
            f"Line {ADDED_RECORD_LINE}", given_names="Anne", surname="Darwin"
        ),
    },
]

SURVEY_CASES: list[ContractCase] = [
    {
        "id": "unsupported_facts_are_counted_by_tag",
        "input_overrides": {
            **named_subject("1 OCCU Botanist"),
            "@I2@": record(
                "0 @I2@ INDI", "1 NAME Emma /Wedgwood/", "1 SEX F", "1 OCCU Pianist", "1 FAMS @F1@"
            ),
            "@S1@": "0 @S1@ SOUR",
        },
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("INDI.OCCU", "2 occupation facts are not imported."),
                ("SOUR", "1 source record is not imported."),
            ),
        },
    },
    {
        "id": "nested_unsupported_structures_are_counted_at_their_path",
        "input_overrides": named_subject(
            "1 BIRT", "2 DATE 1841", "3 TIME 10:00", "2 PLAC Downe", "3 MAP", "4 LATI N51.3", "2 SOUR @S1@"
        ),
        "expected_overrides": {
            **expected_subject(birth=LifeEvent(date=exact(1841), place="Downe")),
            "skipped": skipped(
                ("INDI.BIRT.DATE.TIME", "1 time is not imported."),
                ("INDI.BIRT.PLAC.MAP", "1 map coordinate is not imported."),
                ("INDI.BIRT.SOUR", "1 source citation is not imported."),
            ),
        },
    },
    {
        "id": "plural_nouns_read_naturally",
        "input_overrides": named_subject(
            "1 BIRT", "2 ADDR Down House", "2 ADDR Downe", "2 AGNC Parish", "2 AGNC Crown"
        ),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("INDI.BIRT.ADDR", "2 addresses are not imported."),
                ("INDI.BIRT.AGNC", "2 agencies are not imported."),
            ),
        },
    },
    {
        "id": "custom_and_unknown_tags_are_counted",
        "input_overrides": named_subject("1 _MILT Army", "1 _MILT Navy", "1 HOBB Beetles"),
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("INDI._MILT", "2 custom _MILT entries are not imported."),
                ("INDI.HOBB", "1 HOBB entry is not imported."),
            ),
        },
    },
    {
        "id": "name_and_family_link_details_are_counted",
        "input_overrides": {
            **subject("1 NAME Anne /Darwin/", "2 NICK Annie"),
            **william("1 FAMC @F1@", "2 STAT proven"),
        },
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("INDI.FAMC.STAT", "1 status is not imported."),
                ("INDI.NAME.NICK", "1 nickname is not imported."),
            ),
        },
    },
    {
        "id": "photos_need_a_gedzip_file",
        "input_overrides": {
            **named_subject("1 OBJE @O1@"),
            "@O1@": record("0 @O1@ OBJE", "1 FILE anne.jpg", "2 FORM jpeg"),
        },
        "expected_overrides": {
            **expected_subject(),
            "skipped": skipped(
                ("INDI.OBJE", f"1 photo is not imported. {PHOTOS_NEED_GEDZIP}"),
                ("OBJE", f"1 media record is not imported. {PHOTOS_NEED_GEDZIP}"),
            ),
        },
    },
    {
        "id": "family_notes_and_repositories_are_counted",
        "input_overrides": {
            **marriage("1 MARR", "2 DATE 29 JAN 1839", "2 PLAC Maer", "1 NOTE Married at St Peter's"),
            "@R1@": record("0 @R1@ REPO", "1 NAME Cambridge University Library"),
        },
        "expected_overrides": {
            "skipped": skipped(
                ("FAM.NOTE", "1 family note is not imported."),
                ("REPO", "1 repository record is not imported."),
            )
        },
    },
    {
        "id": "file_metadata_is_not_reported",
        "input_overrides": {
            "HEAD": record(HEAD_551, "1 SOUR PAF", "2 VERS 5", "1 DATE 1 JAN 2020", "1 SUBM @U1@"),
            **named_subject("1 SUBM @U1@", "1 CHAN", "2 DATE 1 JAN 2020", "3 TIME 10:00"),
            "@U1@": record("0 @U1@ SUBM", "1 NAME Anne Darwin"),
            "@U2@": record("0 @U2@ SUBN", "1 FAMF Darwin"),
        },
        "expected_overrides": expected_subject(),
    },
]

CASES = [*PERSON_CASES, *DATE_CASES, *NOTE_CASES, *FAMILY_CASES, *MEMBERSHIP_CASES, *SURVEY_CASES]


@pytest.mark.parametrize("case", CASES, ids=case_ids(CASES))
def test_reader_maps_gedcom_by_contract(case: ContractCase) -> None:
    records = {**_base_input(), **case["input_overrides"]}
    expected = {**_base_expected(), **case["expected_overrides"]}
    actual = _flattened(GedcomReader().read(_payload(records)))
    mismatches = [
        f"{key}: expected {expected.get(key, ABSENT)!r}, got {actual.get(key, ABSENT)!r}"
        for key in sorted(expected.keys() | actual.keys())
        if expected.get(key, ABSENT) != actual.get(key, ABSENT)
    ]
    assert not mismatches, "\n".join(mismatches)


def test_contract_case_ids_are_unique() -> None:
    identifiers = [case["id"] for case in CASES]
    assert len(identifiers) == len(set(identifiers))


def _flattened(document: InterchangeDocument) -> dict[str, object]:
    profiles = {
        f"people.{person.key}.{field}": getattr(person.profile, field)
        for person in document.people
        for field in PROFILE_FIELDS
    }
    return {
        **profiles,
        **{f"people.{person.key}.photo": person.photo for person in document.people},
        "parent_links": links(
            *((link.parent_key, link.child_key, link.kind) for link in document.parent_links)
        ),
        "partnerships": tuple(
            (partnership.first_partner_key, partnership.second_partner_key, partnership.terms)
            for partnership in document.partnerships
        ),
        "skipped": tuple((record.location, record.reason) for record in document.skipped),
    }
