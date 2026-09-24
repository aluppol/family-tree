from collections import Counter
from pathlib import Path

import pytest

from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import DateQualifier, ParentLinkKind, PartnershipKind, Sex
from family_tree.domain.interchange import InterchangeDocument
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.relationships import PartnershipTerms
from tests.adapters.gedcom.builders import exact, qualified

FIXTURE = Path(__file__).with_name("fixtures") / "darwin_wedgwood.ged"
DOWN_HOUSE = "Down House, Downe, Kent, England"


@pytest.fixture(scope="module")
def darwin_wedgwood() -> InterchangeDocument:
    return GedcomReader().read(FIXTURE.read_bytes())


def test_fixture_yields_every_person_link_and_marriage(darwin_wedgwood: InterchangeDocument) -> None:
    counts = (
        len(darwin_wedgwood.people),
        len(darwin_wedgwood.parent_links),
        len(darwin_wedgwood.partnerships),
    )
    assert counts == (16, 20, 6)


def test_charles_darwin_keeps_his_dates_places_and_joined_notes(darwin_wedgwood: InterchangeDocument) -> None:
    charles = _profile(darwin_wedgwood, "@I10@")
    assert charles == PersonProfile(
        given_names="Charles Robert",
        surname="Darwin",
        sex=Sex.MALE,
        birth=LifeEvent(date=exact(1809, 2, 12), place="The Mount, Shrewsbury, Shropshire, England"),
        death=LifeEvent(date=exact(1882, 4, 19), place=DOWN_HOUSE),
        biography=(
            "Naturalist and geologist. His theory of evolution by natural selection was published in On the "
            "Origin of Species (1859).\n\nBuried in Westminster Abbey near John Herschel and Isaac Newton."
        ),
    )


def test_period_details_are_mapped(darwin_wedgwood: InterchangeDocument) -> None:
    details = {
        "christened_only": _profile(darwin_wedgwood, "@I5@").birth,
        "suffix": _profile(darwin_wedgwood, "@I4@").surname,
        "shared_note": _profile(darwin_wedgwood, "@I11@").biography,
        "first_of_two_names": _profile(darwin_wedgwood, "@I8@").full_name(),
    }
    assert details == {
        "christened_only": LifeEvent(date=qualified(DateQualifier.BEFORE, 1764, 5, 6)),
        "suffix": "Wedgwood II",
        "shared_note": "Youngest child of Josiah Wedgwood II and Elizabeth Allen. "
        "She married her first cousin Charles Darwin.",
        "first_of_two_names": "Elizabeth Collier",
    }


def test_erasmus_darwin_has_both_marriages(darwin_wedgwood: InterchangeDocument) -> None:
    marriages = [
        (partnership.second_partner_key, partnership.terms)
        for partnership in darwin_wedgwood.partnerships
        if partnership.first_partner_key == "@I6@"
    ]
    assert marriages == [
        ("@I7@", _married(exact(1757, 12, 30), "Lichfield, Staffordshire, England")),
        ("@I8@", _married(exact(1781, 3, 6), "Radbourne, Derbyshire, England")),
    ]


def test_charles_and_emma_are_the_birth_parents_of_their_children(
    darwin_wedgwood: InterchangeDocument,
) -> None:
    parents = Counter(
        (link.parent_key, link.kind)
        for link in darwin_wedgwood.parent_links
        if link.child_key in {"@I12@", "@I13@", "@I14@", "@I15@"}
    )
    assert parents == {("@I10@", ParentLinkKind.BIRTH): 4, ("@I11@", ParentLinkKind.BIRTH): 4}


def test_unsupported_data_is_reported_once_per_kind(darwin_wedgwood: InterchangeDocument) -> None:
    assert [(record.location, record.reason) for record in darwin_wedgwood.skipped] == [
        ("@I8@ NAME", "Only the first name is imported; 'Elizabeth /Pole/' is skipped."),
        ("INDI.OCCU", "6 occupation facts are not imported."),
        ("INDI.OBJE", "1 photo is not imported. Photos need a GEDZIP file."),
        ("INDI._UID", "1 unique identifier is not imported."),
        ("INDI.CHR", "2 christening facts are not imported."),
        ("INDI.BIRT.SOUR", "1 source citation is not imported."),
        ("INDI.NAME.TYPE", "1 name type is not imported."),
        ("INDI.BURI", "1 burial fact is not imported."),
        ("FAM.NOTE", "1 family note is not imported."),
        ("SOUR", "1 source record is not imported."),
    ]


def _profile(document: InterchangeDocument, key: str) -> PersonProfile:
    return next(person.profile for person in document.people if person.key == key)


def _married(date: GenealogicalDate, place: str) -> PartnershipTerms:
    return PartnershipTerms(kind=PartnershipKind.MARRIAGE, start=LifeEvent(date=date, place=place))
