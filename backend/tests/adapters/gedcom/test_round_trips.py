from collections import Counter
from collections.abc import Callable
from dataclasses import replace
from functools import partial

import pytest

from family_tree.adapters.gedcom.gedcom7_writer import Gedcom7Writer
from family_tree.adapters.gedcom.gedcom551_writer import Gedcom551Writer
from family_tree.adapters.gedcom.gedzip_writer import GedzipWriter
from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.enums import ParentLinkKind, PartnershipKind, Sex
from family_tree.domain.interchange import InterchangeDocument, TreeSnapshot
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.ports import InterchangeWriter
from family_tree.domain.relationships import PartnershipTerms
from tests.adapters.gedcom.builders import parent_link, person, profile, snapshot
from tests.adapters.gedcom.samples import darwin_household, every_feature_snapshot, random_snapshot

type Comparable = dict[str, object]
type Expectation = Callable[[TreeSnapshot], Comparable]

SAMPLES: list[Callable[[], TreeSnapshot]] = [
    darwin_household,
    every_feature_snapshot,
    *(partial(random_snapshot, seed=seed, size=150) for seed in range(1, 5)),
]
SAMPLE_IDS = ["darwin_household", "every_feature", *(f"random_{seed}" for seed in range(1, 5))]


def comparable(document: InterchangeDocument) -> Comparable:
    return {
        "people": {person.key: person.profile for person in document.people},
        "photos": {person.key: person.photo for person in document.people if person.photo is not None},
        "parent_links": sorted(
            (link.parent_key, link.child_key, link.kind) for link in document.parent_links
        ),
        "partnerships": Counter(
            (frozenset((partnership.first_partner_key, partnership.second_partner_key)), partnership.terms)
            for partnership in document.partnerships
        ),
        "skipped": list(document.skipped),
    }


def as_gedcom551(sample: TreeSnapshot) -> Comparable:
    people = {
        key: replace(profile, sex=Sex.UNKNOWN) if profile.sex is Sex.OTHER else profile
        for key, profile in _profiles(sample).items()
    }
    return {**_relationships(sample), "people": people, "photos": {}}


def as_gedcom7(sample: TreeSnapshot) -> Comparable:
    return {**_relationships(sample), "people": _profiles(sample), "photos": {}}


def as_gedzip(sample: TreeSnapshot) -> Comparable:
    photos = {f"@I{person_id}@": photo for person_id, photo in sample.photos.items()}
    return {**_relationships(sample), "people": _profiles(sample), "photos": photos}


FORMATS: list[tuple[InterchangeWriter, Expectation]] = [
    (Gedcom551Writer(), as_gedcom551),
    (Gedcom7Writer(), as_gedcom7),
    (GedzipWriter(), as_gedzip),
]


@pytest.mark.parametrize("sample", SAMPLES, ids=SAMPLE_IDS)
@pytest.mark.parametrize(("writer", "expectation"), FORMATS, ids=["gedcom-5.5.1", "gedcom-7.0", "gedzip"])
def test_reading_what_was_written_reproduces_the_tree(
    writer: InterchangeWriter, expectation: Expectation, sample: Callable[[], TreeSnapshot]
) -> None:
    tree = sample()
    assert comparable(GedcomReader().read(writer.write(tree))) == expectation(tree)


@pytest.mark.parametrize("writer", [Gedcom551Writer(), Gedcom7Writer()], ids=["gedcom-5.5.1", "gedcom-7.0"])
def test_text_that_cannot_be_split_between_words_survives_intact(writer: InterchangeWriter) -> None:
    biography = " ".join(["a @ b"] * 200) + " " * 600 + "@" * 555 + "\n" + "\n@" * 3
    tree = snapshot([person(1, profile("Anne", "Darwin", biography=biography))])
    assert GedcomReader().read(writer.write(tree)).people[0].profile.biography == biography


def test_unpartnered_co_parents_come_back_as_an_unmarried_partnership() -> None:
    tree = snapshot(
        [
            person(1, profile("Anne", "Darwin")),
            person(2, profile("Erasmus", "Darwin")),
            person(3, profile("Ida", "")),
        ],
        [parent_link(1, 1, 3, ParentLinkKind.BIRTH), parent_link(2, 2, 3, ParentLinkKind.BIRTH)],
    )
    partnerships = GedcomReader().read(Gedcom7Writer().write(tree)).partnerships
    unmarried = PartnershipTerms(kind=PartnershipKind.PARTNERSHIP, start=LifeEvent())
    assert [(each.first_partner_key, each.second_partner_key, each.terms) for each in partnerships] == [
        ("@I1@", "@I2@", unmarried)
    ]


def _profiles(sample: TreeSnapshot) -> dict[str, PersonProfile]:
    return {f"@I{person.id}@": person.profile for person in sample.people}


def _relationships(sample: TreeSnapshot) -> Comparable:
    links = sorted((f"@I{link.parent_id}@", f"@I{link.child_id}@", link.kind) for link in sample.parent_links)
    partnerships = Counter(
        (
            frozenset((f"@I{partnership.first_partner_id}@", f"@I{partnership.second_partner_id}@")),
            partnership.terms,
        )
        for partnership in sample.partnerships
    )
    return {"parent_links": links, "partnerships": partnerships, "skipped": []}
