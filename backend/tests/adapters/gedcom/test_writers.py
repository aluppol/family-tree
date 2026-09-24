import io
import zipfile
from itertools import pairwise
from typing import cast

import pytest

from family_tree.adapters.gedcom.gedcom7_writer import Gedcom7Writer
from family_tree.adapters.gedcom.gedcom551_writer import Gedcom551Writer
from family_tree.adapters.gedcom.gedzip_writer import GedzipWriter
from family_tree.adapters.gedcom.registry import writer_for
from family_tree.domain.enums import InterchangeFormat, ParentLinkKind, PartnershipKind, Sex
from family_tree.domain.errors import InvalidInput
from family_tree.domain.interchange import TreeSnapshot
from family_tree.domain.people import Person
from family_tree.domain.photos import photo_from_bytes
from family_tree.domain.ports import InterchangeWriter
from tests.adapters.gedcom.builders import (
    jpeg_bytes,
    parent_link,
    partnership,
    person,
    png_bytes,
    profile,
    snapshot,
    terms,
    webp_bytes,
)
from tests.adapters.gedcom.gedcom_validator import GEDCOM_7, GEDCOM_551, ValidationRules, gedcom_problems
from tests.adapters.gedcom.samples import darwin_household, every_feature_snapshot, random_snapshot
from tests.contract import ContractCase, case_ids

FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
MEDIA_LINKS = ("1 OBJE @O1@", "1 OBJE @O2@", "1 OBJE @O4@")
MEDIA_RECORDS = (
    "0 @O1@ OBJE",
    "1 FILE media/I1.jpg",
    "2 FORM image/jpeg",
    "0 @O2@ OBJE",
    "1 FILE media/I2.png",
    "2 FORM image/png",
    "0 @O4@ OBJE",
    "1 FILE media/I4.webp",
    "2 FORM image/webp",
)
GEDCOM_551_LINES = (
    "0 HEAD",
    "1 SOUR FAMILY_TREE",
    "2 VERS 1.0",
    "2 NAME Family Tree",
    "1 SUBM @U1@",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
    "0 @U1@ SUBM",
    "1 NAME Family Tree",
    "0 @I1@ INDI",
    "1 NAME Charles Robert /Darwin/",
    "2 GIVN Charles Robert",
    "2 SURN Darwin",
    "1 SEX M",
    "1 BIRT",
    "2 DATE 12 FEB 1809",
    "2 PLAC Shrewsbury",
    "1 DEAT",
    "2 DATE 19 APR 1882",
    "2 PLAC Downe",
    "1 NOTE Naturalist.",
    "2 CONT Wrote On the Origin of Species.",
    "1 FAMS @F1@",
    "0 @I2@ INDI",
    "1 NAME Emma /Wedgwood/",
    "2 GIVN Emma",
    "2 SURN Wedgwood",
    "1 SEX F",
    "1 BIRT",
    "2 DATE 2 MAY 1808",
    "2 PLAC Maer Hall",
    "1 DEAT",
    "2 DATE 2 OCT 1896",
    "1 FAMS @F1@",
    "1 FAMS @F2@",
    "0 @I3@ INDI",
    "1 NAME William Erasmus /Darwin/",
    "2 GIVN William Erasmus",
    "2 SURN Darwin",
    "1 SEX M",
    "1 BIRT",
    "2 DATE 27 DEC 1839",
    "1 FAMC @F1@",
    "0 @I4@ INDI",
    "1 NAME Anne",
    "2 GIVN Anne",
    "1 SEX U",
    "1 DEAT Y",
    "1 FAMC @F1@",
    "2 PEDI adopted",
    "1 FAMC @F3@",
    "2 PEDI foster",
    "0 @I5@ INDI",
    "1 NAME /Wedgwood/",
    "2 SURN Wedgwood",
    "1 SEX U",
    "1 NOTE @@home and anne@@darwin.example",
    "1 FAMS @F2@",
    "1 FAMS @F3@",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I2@",
    "1 CHIL @I3@",
    "1 CHIL @I4@",
    "1 MARR",
    "2 DATE 29 JAN 1839",
    "2 PLAC Maer",
    "0 @F2@ FAM",
    "1 HUSB @I5@",
    "1 WIFE @I2@",
    "1 EVEN Partnership",
    "2 TYPE Partnership",
    "2 DATE ABT 1850",
    "2 PLAC London",
    "1 EVEN Separation",
    "2 TYPE Separation",
    "2 DATE BEF 1860",
    "0 @F3@ FAM",
    "1 HUSB @I5@",
    "1 CHIL @I4@",
    "0 TRLR",
)
GEDCOM_7_LINES = (
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    "1 SOUR FAMILY_TREE",
    "2 VERS 1.0",
    "2 NAME Family Tree",
    "0 @I1@ INDI",
    "1 NAME Charles Robert /Darwin/",
    "2 GIVN Charles Robert",
    "2 SURN Darwin",
    "1 SEX M",
    "1 BIRT",
    "2 DATE 12 FEB 1809",
    "2 PLAC Shrewsbury",
    "1 DEAT",
    "2 DATE 19 APR 1882",
    "2 PLAC Downe",
    "1 NOTE Naturalist.",
    "2 CONT Wrote On the Origin of Species.",
    "1 FAMS @F1@",
    "0 @I2@ INDI",
    "1 NAME Emma /Wedgwood/",
    "2 GIVN Emma",
    "2 SURN Wedgwood",
    "1 SEX F",
    "1 BIRT",
    "2 DATE 2 MAY 1808",
    "2 PLAC Maer Hall",
    "1 DEAT",
    "2 DATE 2 OCT 1896",
    "1 FAMS @F1@",
    "1 FAMS @F2@",
    "0 @I3@ INDI",
    "1 NAME William Erasmus /Darwin/",
    "2 GIVN William Erasmus",
    "2 SURN Darwin",
    "1 SEX M",
    "1 BIRT",
    "2 DATE 27 DEC 1839",
    "1 FAMC @F1@",
    "0 @I4@ INDI",
    "1 NAME Anne",
    "2 GIVN Anne",
    "1 SEX X",
    "1 DEAT Y",
    "1 FAMC @F1@",
    "2 PEDI ADOPTED",
    "1 FAMC @F3@",
    "2 PEDI FOSTER",
    "0 @I5@ INDI",
    "1 NAME /Wedgwood/",
    "2 SURN Wedgwood",
    "1 SEX U",
    "1 NOTE @@home and anne@darwin.example",
    "1 FAMS @F2@",
    "1 FAMS @F3@",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I2@",
    "1 CHIL @I3@",
    "1 CHIL @I4@",
    "1 MARR",
    "2 DATE 29 JAN 1839",
    "2 PLAC Maer",
    "0 @F2@ FAM",
    "1 HUSB @I5@",
    "1 WIFE @I2@",
    "1 EVEN Partnership",
    "2 TYPE Partnership",
    "2 DATE ABT 1850",
    "2 PLAC London",
    "1 EVEN Separation",
    "2 TYPE Separation",
    "2 DATE BEF 1860",
    "0 @F3@ FAM",
    "1 HUSB @I5@",
    "1 CHIL @I4@",
    "0 TRLR",
)


def document(lines: tuple[str, ...]) -> bytes:
    return "".join(f"{line}\n" for line in lines).encode("utf-8")


def test_gedcom551_writer_writes_the_documented_form() -> None:
    assert Gedcom551Writer().write(darwin_household()) == document(GEDCOM_551_LINES)


def test_gedcom7_writer_writes_the_documented_form_after_a_byte_order_mark() -> None:
    assert Gedcom7Writer().write(darwin_household()) == b"\xef\xbb\xbf" + document(GEDCOM_7_LINES)


def test_gedzip_writer_packs_gedcom7_with_media_records_and_photo_files() -> None:
    archive = zipfile.ZipFile(io.BytesIO(GedzipWriter().write(_household_with_photos())))
    assert [(entry.filename, entry.compress_type, entry.date_time) for entry in archive.infolist()] == [
        ("gedcom.ged", zipfile.ZIP_DEFLATED, FIXED_TIMESTAMP),
        ("media/I1.jpg", zipfile.ZIP_STORED, FIXED_TIMESTAMP),
        ("media/I2.png", zipfile.ZIP_STORED, FIXED_TIMESTAMP),
        ("media/I4.webp", zipfile.ZIP_STORED, FIXED_TIMESTAMP),
    ]
    photo_files = [archive.read(name) for name in ("media/I1.jpg", "media/I2.png", "media/I4.webp")]
    assert photo_files == [jpeg_bytes(), png_bytes(), webp_bytes()]


def test_gedzip_gedcom_adds_only_media_links_and_media_records() -> None:
    archive = zipfile.ZipFile(io.BytesIO(GedzipWriter().write(_household_with_photos())))
    lines = archive.read("gedcom.ged").decode("utf-8-sig").splitlines()
    records = _records(lines)
    assert [records[xref][-1] for xref in ("@I1@", "@I2@", "@I4@")] == list(MEDIA_LINKS)
    assert lines[-len(MEDIA_RECORDS) - 1 :] == [*MEDIA_RECORDS, "0 TRLR"]
    assert [line for line in lines if line not in {*MEDIA_LINKS, *MEDIA_RECORDS}] == list(GEDCOM_7_LINES)


def _household_with_photos() -> TreeSnapshot:
    photos = {
        1: photo_from_bytes(jpeg_bytes()),
        2: photo_from_bytes(png_bytes()),
        4: photo_from_bytes(webp_bytes()),
    }
    household = darwin_household()
    return snapshot(
        household.people, household.parent_links, household.partnerships, {**photos, 99: photos[1]}
    )


def _records(lines: list[str]) -> dict[str, list[str]]:
    starts = [index for index, line in enumerate(lines) if line.startswith("0 ")]
    return {lines[start].split()[1]: lines[start:end] for start, end in pairwise([*starts, len(lines)])}


TEXT_WRITERS: list[tuple[InterchangeWriter, ValidationRules]] = [
    (Gedcom551Writer(), GEDCOM_551),
    (Gedcom7Writer(), GEDCOM_7),
]


@pytest.mark.parametrize(("writer", "rules"), TEXT_WRITERS, ids=["gedcom-5.5.1", "gedcom-7.0"])
def test_text_writers_pass_the_structural_validator(
    writer: InterchangeWriter, rules: ValidationRules
) -> None:
    for sample in (darwin_household(), every_feature_snapshot(), random_snapshot(seed=11, size=300)):
        assert gedcom_problems(writer.write(sample).decode("utf-8"), rules) == []


def test_gedzip_gedcom_passes_the_structural_validator() -> None:
    archive = zipfile.ZipFile(io.BytesIO(GedzipWriter().write(every_feature_snapshot())))
    assert gedcom_problems(archive.read("gedcom.ged").decode("utf-8"), GEDCOM_7) == []


@pytest.mark.parametrize(
    "writer", [Gedcom551Writer(), Gedcom7Writer(), GedzipWriter()], ids=list(InterchangeFormat)
)
def test_writers_are_deterministic_whatever_the_input_order(writer: InterchangeWriter) -> None:
    sample = random_snapshot(seed=5, size=120)
    reordered = TreeSnapshot(
        people=sample.people[::-1],
        parent_links=sample.parent_links[::-1],
        partnerships=sample.partnerships[::-1],
        photos=dict(reversed(list(sample.photos.items()))),
    )
    assert writer.write(sample) == writer.write(reordered)


def test_gedcom551_splits_long_text_into_short_lines_between_words() -> None:
    biography = " ".join(["Down House, the family home in Kent;"] * 30 + ["mail@darwin.example"] * 10)
    text = Gedcom551Writer().write(snapshot([person(1, profile("Anne", "Darwin", biography=biography))]))
    lines = text.decode("utf-8").splitlines()
    concatenated = [line for line in lines if line.startswith("2 CONC ")]
    assert len(concatenated) >= 5
    assert max(len(line) for line in lines) <= 254
    assert gedcom_problems(text.decode("utf-8"), GEDCOM_551) == []


@pytest.mark.parametrize(
    ("interchange_format", "writer_type"),
    [
        (InterchangeFormat.GEDCOM_551, Gedcom551Writer),
        (InterchangeFormat.GEDCOM_7, Gedcom7Writer),
        (InterchangeFormat.GEDZIP, GedzipWriter),
    ],
)
def test_registry_returns_the_writer_of_each_format(
    interchange_format: InterchangeFormat, writer_type: type
) -> None:
    assert isinstance(writer_for(interchange_format), writer_type)


def test_registry_rejects_an_unregistered_format() -> None:
    with pytest.raises(InvalidInput) as raised:
        writer_for(cast("InterchangeFormat", "csv"))
    expected = ("gedcom.unknown_format", "Family trees cannot be exported as 'csv'.")
    assert (raised.value.code, raised.value.message) == expected


def people(*sexes: Sex) -> list[Person]:
    return [
        person(number, profile(f"Person{number}", "Test", sex)) for number, sex in enumerate(sexes, start=1)
    ]


MARRIED = terms(PartnershipKind.MARRIAGE)
PARTNERED = terms(PartnershipKind.PARTNERSHIP)
BIRTH = ParentLinkKind.BIRTH
ADOPTED = ParentLinkKind.ADOPTED
OTHER = ParentLinkKind.OTHER

FAMILY_LAYOUT_CASES: list[ContractCase] = [
    {
        "id": "husband_slot_goes_to_the_male_partner_whatever_the_order",
        "input_overrides": {
            "snapshot": snapshot(people(Sex.FEMALE, Sex.MALE), [], [partnership(1, 1, 2, MARRIED)])
        },
        "expected_overrides": {"families": [["0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR Y"]]},
    },
    {
        "id": "same_sex_partners_keep_their_order",
        "input_overrides": {
            "snapshot": snapshot(people(Sex.FEMALE, Sex.FEMALE), [], [partnership(1, 2, 1, PARTNERED)])
        },
        "expected_overrides": {"families": [["0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@"]]},
    },
    {
        "id": "single_mother_is_the_wife",
        "input_overrides": {
            "snapshot": snapshot(people(Sex.FEMALE, Sex.MALE), [parent_link(1, 1, 2, BIRTH)])
        },
        "expected_overrides": {"families": [["0 @F1@ FAM", "1 WIFE @I1@", "1 CHIL @I2@"]]},
    },
    {
        "id": "single_parent_of_unknown_sex_is_the_husband",
        "input_overrides": {
            "snapshot": snapshot(people(Sex.UNKNOWN, Sex.MALE), [parent_link(1, 1, 2, BIRTH)])
        },
        "expected_overrides": {"families": [["0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@"]]},
    },
    {
        "id": "unpartnered_co_parents_share_a_family_without_events",
        "input_overrides": {
            "snapshot": snapshot(
                people(Sex.FEMALE, Sex.MALE, Sex.MALE),
                [parent_link(1, 1, 3, BIRTH), parent_link(2, 2, 3, BIRTH)],
            )
        },
        "expected_overrides": {"families": [["0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 CHIL @I3@"]]},
    },
    {
        "id": "children_of_a_remarried_couple_join_the_first_partnership",
        "input_overrides": {
            "snapshot": snapshot(
                people(Sex.MALE, Sex.FEMALE, Sex.MALE),
                [parent_link(1, 1, 3, BIRTH), parent_link(2, 2, 3, BIRTH)],
                [partnership(2, 1, 2, PARTNERED), partnership(1, 2, 1, MARRIED)],
            )
        },
        "expected_overrides": {
            "families": [
                ["0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I3@", "1 MARR Y"],
                ["0 @F2@ FAM", "1 HUSB @I1@", "1 WIFE @I2@"],
            ]
        },
    },
    {
        "id": "birth_and_adoptive_couples_get_separate_families",
        "input_overrides": {
            "snapshot": snapshot(
                people(Sex.MALE, Sex.FEMALE, Sex.MALE, Sex.FEMALE, Sex.MALE),
                [
                    parent_link(1, 1, 5, BIRTH),
                    parent_link(2, 2, 5, BIRTH),
                    parent_link(3, 3, 5, ADOPTED),
                    parent_link(4, 4, 5, ADOPTED),
                ],
                [partnership(1, 1, 2, MARRIED), partnership(2, 3, 4, MARRIED)],
            )
        },
        "expected_overrides": {
            "families": [
                ["0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I5@", "1 MARR Y"],
                ["0 @F2@ FAM", "1 HUSB @I3@", "1 WIFE @I4@", "1 CHIL @I5@", "1 MARR Y"],
            ]
        },
    },
    {
        "id": "mother_and_adoptive_stepfather_get_a_family_each",
        "input_overrides": {
            "snapshot": snapshot(
                people(Sex.FEMALE, Sex.MALE, Sex.MALE),
                [parent_link(1, 1, 3, BIRTH), parent_link(2, 2, 3, ADOPTED)],
                [partnership(1, 1, 2, MARRIED)],
            )
        },
        "expected_overrides": {
            "families": [
                ["0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR Y"],
                ["0 @F2@ FAM", "1 WIFE @I1@", "1 CHIL @I3@"],
                ["0 @F3@ FAM", "1 HUSB @I2@", "1 CHIL @I3@"],
            ]
        },
    },
    {
        "id": "three_parents_of_one_kind_split_into_the_couple_and_the_other_parent",
        "input_overrides": {
            "snapshot": snapshot(
                people(Sex.MALE, Sex.FEMALE, Sex.FEMALE, Sex.MALE),
                [parent_link(1, 3, 4, OTHER), parent_link(2, 1, 4, OTHER), parent_link(3, 2, 4, OTHER)],
                [partnership(1, 1, 2, PARTNERED)],
            )
        },
        "expected_overrides": {
            "families": [
                ["0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I4@"],
                ["0 @F2@ FAM", "1 WIFE @I3@", "1 CHIL @I4@"],
            ]
        },
    },
    {
        "id": "links_and_partnerships_with_unknown_people_are_left_out",
        "input_overrides": {
            "snapshot": snapshot(
                people(Sex.MALE, Sex.FEMALE),
                [parent_link(1, 99, 2, BIRTH), parent_link(2, 1, 98, BIRTH)],
                [partnership(1, 1, 97, MARRIED)],
            )
        },
        "expected_overrides": {"families": []},
    },
]


@pytest.mark.parametrize("case", FAMILY_LAYOUT_CASES, ids=case_ids(FAMILY_LAYOUT_CASES))
def test_writers_lay_out_families_by_contract(case: ContractCase) -> None:
    lines = Gedcom551Writer().write(case["input_overrides"]["snapshot"]).decode("utf-8").splitlines()
    families = [record for xref, record in _records(lines).items() if xref.startswith("@F")]
    assert families == case["expected_overrides"]["families"]


def test_child_links_name_the_pedigree_of_each_family() -> None:
    household = snapshot(
        people(Sex.FEMALE, Sex.MALE, Sex.MALE, Sex.FEMALE),
        [
            parent_link(1, 1, 3, BIRTH),
            parent_link(2, 2, 3, ADOPTED),
            parent_link(3, 4, 3, ParentLinkKind.FOSTER),
        ],
    )
    records = _records(Gedcom7Writer().write(household).decode("utf-8-sig").splitlines())
    child_links = [line for line in records["@I3@"] if line.startswith(("1 FAMC", "2 PEDI"))]
    assert child_links == ["1 FAMC @F1@", "1 FAMC @F2@", "2 PEDI ADOPTED", "1 FAMC @F3@", "2 PEDI FOSTER"]
