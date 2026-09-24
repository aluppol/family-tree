import hashlib
from collections.abc import Sequence

from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import DateQualifier, ParentLinkKind, PartnershipEndReason, PartnershipKind, Sex
from family_tree.domain.interchange import TreeSnapshot
from family_tree.domain.people import LifeEvent, Person, PersonProfile
from family_tree.domain.photos import photo_from_bytes
from family_tree.domain.relationships import ParentLink, Partnership, PartnershipEnd, PartnershipTerms
from tests.adapters.gedcom.builders import (
    between,
    exact,
    jpeg_bytes,
    parent_link,
    partnership,
    person,
    png_bytes,
    profile,
    qualified,
    snapshot,
    terms,
    webp_bytes,
)


def darwin_household() -> TreeSnapshot:
    return snapshot(_household_people(), _household_links(), _household_partnerships())


def _household_people() -> list[Person]:
    charles = profile(
        "Charles Robert",
        "Darwin",
        Sex.MALE,
        birth=LifeEvent(date=exact(1809, 2, 12), place="Shrewsbury"),
        death=LifeEvent(date=exact(1882, 4, 19), place="Downe"),
        biography="Naturalist.\nWrote On the Origin of Species.",
    )
    emma = profile(
        "Emma",
        "Wedgwood",
        Sex.FEMALE,
        birth=LifeEvent(date=exact(1808, 5, 2), place="Maer Hall"),
        death=LifeEvent(date=exact(1896, 10, 2)),
    )
    return [
        person(1, charles),
        person(2, emma),
        person(3, profile("William Erasmus", "Darwin", Sex.MALE, birth=LifeEvent(date=exact(1839, 12, 27)))),
        person(4, profile("Anne", "", Sex.OTHER, death=LifeEvent())),
        person(5, profile("", "Wedgwood", biography="@home and anne@darwin.example")),
    ]


def _household_links() -> list[ParentLink]:
    return [
        parent_link(1, 1, 3, ParentLinkKind.BIRTH),
        parent_link(2, 2, 3, ParentLinkKind.BIRTH),
        parent_link(3, 1, 4, ParentLinkKind.ADOPTED),
        parent_link(4, 2, 4, ParentLinkKind.ADOPTED),
        parent_link(5, 5, 4, ParentLinkKind.FOSTER),
    ]


def _household_partnerships() -> list[Partnership]:
    separated = PartnershipEnd(
        reason=PartnershipEndReason.SEPARATION, date=qualified(DateQualifier.BEFORE, 1860)
    )
    london = LifeEvent(date=qualified(DateQualifier.ABOUT, 1850), place="London")
    return [
        partnership(
            1, 1, 2, terms(PartnershipKind.MARRIAGE, LifeEvent(date=exact(1839, 1, 29), place="Maer"))
        ),
        partnership(2, 2, 5, terms(PartnershipKind.PARTNERSHIP, london, separated)),
    ]


def every_feature_snapshot() -> TreeSnapshot:
    people = [*_darwin_people(), *_edge_case_people(), *_other_family_people()]
    photos = {
        1: photo_from_bytes(jpeg_bytes()),
        2: photo_from_bytes(png_bytes()),
        9: photo_from_bytes(webp_bytes()),
    }
    return snapshot(people, _every_link(), _every_partnership(), photos)


def _darwin_people() -> list[Person]:
    return [
        person(
            1,
            profile(
                "Charles Robert", "Darwin", Sex.MALE, *_charles_events(), "Naturalist.\n\nWrote a book.\n"
            ),
        ),
        person(
            2, profile("Emma", "Wedgwood", Sex.FEMALE, LifeEvent(date=qualified(DateQualifier.ABOUT, 1808)))
        ),
        person(3, profile("William Erasmus", "Darwin", Sex.MALE, LifeEvent(date=_calculated_march_1839()))),
        person(4, profile("Anne Elizabeth", "Darwin", Sex.FEMALE, *_anne_events())),
        person(
            5,
            profile(
                "Etty", "", Sex.OTHER, death=LifeEvent(), biography="@home\n@@double\nmail@darwin.example"
            ),
        ),
        person(6, profile("", "Wedgwood", birth=LifeEvent(place="Etruria"), biography="  spaced out  ")),
    ]


def _charles_events() -> tuple[LifeEvent, LifeEvent]:
    return (
        LifeEvent(date=exact(1809, 2, 12), place="The Mount, Shrewsbury"),
        LifeEvent(date=exact(1882, 4, 19), place="Down House, Downe"),
    )


def _calculated_march_1839() -> GenealogicalDate:
    return qualified(DateQualifier.CALCULATED, 1839, 3)


def _anne_events() -> tuple[LifeEvent, LifeEvent]:
    return (
        LifeEvent(date=qualified(DateQualifier.ESTIMATED, 1841)),
        LifeEvent(date=qualified(DateQualifier.AFTER, 1851), place="Malvern @ Worcestershire"),
    )


def _edge_case_people() -> list[Person]:
    long_profile = profile(
        "G" * 120,
        "S" * 120,
        Sex.MALE,
        LifeEvent(date=between(1700, 1705), place="P" * 200),
        None,
        _long_biography(),
    )
    return [
        person(
            7,
            profile(
                "Jean/Paul", "Sartre @ Paris", Sex.MALE, LifeEvent(date=qualified(DateQualifier.BEFORE, 1905))
            ),
        ),
        person(8, long_profile),
        person(9, profile("Łukasz", "Grønwald", Sex.MALE, biography="家族 ☃ été")),
        person(10, profile("Mary", "Howard", Sex.FEMALE, death=LifeEvent(place="Lichfield"))),
        person(11, profile("Robert Waring", "Darwin", Sex.MALE)),
        person(12, profile("Susannah", "Wedgwood", Sex.FEMALE)),
    ]


def _long_biography() -> str:
    parts = [
        "Down House, the family home in Kent. " * 60,
        "x" * 600,
        " " * 40,
        "@" * 301,
        "\n\n",
        "yes @ zed " * 800,
    ]
    return "".join(parts)[:10_000]


def _other_family_people() -> list[Person]:
    names = [
        (13, "Alice", "Smith", Sex.FEMALE),
        (14, "Beth", "Jones", Sex.FEMALE),
        (15, "Cara", "Smith", Sex.FEMALE),
    ]
    names += [
        (16, "Carl", "Brown", Sex.MALE),
        (17, "Dora", "Brown", Sex.FEMALE),
        (18, "Finn", "Darwin", Sex.UNKNOWN),
    ]
    names += [(19, "Gale", "Darwin", Sex.OTHER)]
    return [person(number, profile(given, surname, sex)) for number, given, surname, sex in names]


def _every_link() -> list[ParentLink]:
    kinds = [
        (11, 1, ParentLinkKind.BIRTH),
        (12, 1, ParentLinkKind.BIRTH),
        (1, 3, ParentLinkKind.BIRTH),
        (2, 3, ParentLinkKind.BIRTH),
        (1, 4, ParentLinkKind.BIRTH),
        (2, 4, ParentLinkKind.BIRTH),
        (16, 15, ParentLinkKind.BIRTH),
        (17, 15, ParentLinkKind.BIRTH),
        (13, 15, ParentLinkKind.ADOPTED),
        (14, 15, ParentLinkKind.ADOPTED),
        (2, 18, ParentLinkKind.FOSTER),
        (1, 19, ParentLinkKind.OTHER),
        (2, 19, ParentLinkKind.OTHER),
        (6, 19, ParentLinkKind.OTHER),
    ]
    return [
        parent_link(number, parent, child, kind)
        for number, (parent, child, kind) in enumerate(kinds, start=1)
    ]


def _every_partnership() -> list[Partnership]:
    maer = LifeEvent(date=exact(1839, 1, 29), place="Maer")
    leeds = LifeEvent(date=qualified(DateQualifier.ABOUT, 1990), place="Leeds")
    return [
        partnership(
            1, 2, 1, terms(PartnershipKind.MARRIAGE, maer, _end(PartnershipEndReason.DIVORCE, exact(1850)))
        ),
        partnership(2, 1, 2, terms(PartnershipKind.MARRIAGE, LifeEvent(date=exact(1855)))),
        partnership(
            3, 1, 10, terms(PartnershipKind.MARRIAGE, None, _end(PartnershipEndReason.ANNULMENT, exact(1830)))
        ),
        partnership(
            4, 13, 14, terms(PartnershipKind.PARTNERSHIP, leeds, _end(PartnershipEndReason.SEPARATION, None))
        ),
        partnership(
            5, 16, 17, terms(PartnershipKind.PARTNERSHIP, None, _end(PartnershipEndReason.DIVORCE, None))
        ),
        partnership(6, 11, 12, terms(PartnershipKind.MARRIAGE, LifeEvent(place="St Chad's, Shrewsbury"))),
        partnership(
            7, 3, 9, terms(PartnershipKind.PARTNERSHIP, None, _end(PartnershipEndReason.ANNULMENT, None))
        ),
        partnership(
            8,
            4,
            7,
            terms(PartnershipKind.PARTNERSHIP, None, _end(PartnershipEndReason.SEPARATION, exact(1901))),
        ),
    ]


def _end(reason: PartnershipEndReason, date: GenealogicalDate | None) -> PartnershipEnd:
    return PartnershipEnd(reason=reason, date=date)


_GIVEN_NAMES = (
    "Anne",
    "Charles",
    "Emma",
    "Erasmus",
    "Francis",
    "George",
    "Henrietta",
    "Horace",
    "Josiah",
    "Mary",
)
_SURNAMES = ("Darwin", "Wedgwood", "Allen", "Galton", "Howard", "Pole", "")
_PLACES = ("", "Shrewsbury", "Downe, Kent", "Maer Hall, Staffordshire", "Cambridge", "Etruria @ Stoke")
_WORDS = (
    "naturalist",
    "potter",
    "and",
    "@",
    "the",
    "family",
    "letters",
    "\n",
    "Down House",
    "@@",
    "  ",
    "\u00e9t\u00e9",
)


def random_snapshot(seed: int, size: int) -> TreeSnapshot:
    numbers = range(1, size + 1)
    people = [person(number, _random_profile(f"{seed}/{number}")) for number in numbers]
    partnerships = [
        partnership(
            number, *_distinct_pair(f"{seed}/couple/{number}", size), _random_terms(f"{seed}/terms/{number}")
        )
        for number in range(1, size // 3 + 1)
    ]
    children = [number for number in numbers if _chance(f"{seed}/child/{number}", 0.5)]
    links = [
        link for child in children for link in _random_parents(f"{seed}/parents/{child}", child, partnerships)
    ]
    photographed = [number for number in numbers if _chance(f"{seed}/photo/{number}", 0.1)]
    photos = dict.fromkeys(photographed, photo_from_bytes(jpeg_bytes()))
    return snapshot(
        people, [parent_link(number, *link) for number, link in enumerate(links, 1)], partnerships, photos
    )


def _random_profile(key: str) -> PersonProfile:
    surname = _pick(f"{key}/surname", _SURNAMES)
    given_names = _pick(f"{key}/given", _GIVEN_NAMES if not surname else ("", *_GIVEN_NAMES))
    birth = LifeEvent(date=_random_date(f"{key}/birth"), place=_pick(f"{key}/birthplace", _PLACES))
    words = [_pick(f"{key}/word/{index}", _WORDS) for index in range(_number(f"{key}/words", 0, 80))]
    death = _random_death(f"{key}/death")
    return profile(given_names, surname, _pick(f"{key}/sex", list(Sex)), birth, death, " ".join(words))


def _random_date(key: str) -> GenealogicalDate | None:
    if _chance(f"{key}/missing", 0.2):
        return None
    year = _number(f"{key}/year", 1600, 2000)
    qualifier = _pick(f"{key}/qualifier", list(DateQualifier))
    if qualifier is DateQualifier.BETWEEN:
        return between(year, year + _number(f"{key}/span", 0, 10))
    month = _number(f"{key}/month", 1, 12) if _chance(f"{key}/has_month", 0.7) else None
    day = _number(f"{key}/day", 1, 28) if month is not None and _chance(f"{key}/has_day", 0.7) else None
    return qualified(qualifier, year, month, day)


def _random_death(key: str) -> LifeEvent | None:
    if _chance(f"{key}/living", 0.4):
        return None
    if _chance(f"{key}/undetailed", 0.2):
        return LifeEvent()
    return LifeEvent(date=_random_date(key), place=_pick(f"{key}/place", _PLACES))


def _random_terms(key: str) -> PartnershipTerms:
    start = LifeEvent(date=_random_date(f"{key}/start"), place=_pick(f"{key}/place", _PLACES))
    reason = _pick(f"{key}/reason", list(PartnershipEndReason))
    end = _end(reason, _random_date(f"{key}/end")) if _chance(f"{key}/ended", 0.5) else None
    return terms(_pick(f"{key}/kind", list(PartnershipKind)), start, end)


def _random_parents(
    key: str, child: int, partnerships: list[Partnership]
) -> list[tuple[int, int, ParentLinkKind]]:
    kinds = sorted(
        {_pick(f"{key}/kind/{index}", list(ParentLinkKind)) for index in range(_number(f"{key}/kinds", 1, 2))}
    )
    chosen: list[tuple[int, int, ParentLinkKind]] = []
    for kind in kinds:
        taken = {child, *(parent for parent, _, _ in chosen)}
        parents = _random_parent_set(f"{key}/{kind}", partnerships, taken)
        chosen += [(parent, child, kind) for parent in parents]
    return chosen


def _random_parent_set(key: str, partnerships: list[Partnership], taken: set[int]) -> tuple[int, ...]:
    couple = _pick(f"{key}/couple", partnerships)
    partners = (couple.first_partner_id, couple.second_partner_id)
    if _chance(f"{key}/as_couple", 0.6) and taken.isdisjoint(partners):
        return partners
    single = _pick(f"{key}/single", partners)
    return () if single in taken else (single,)


def _distinct_pair(key: str, size: int) -> tuple[int, int]:
    first = _number(f"{key}/first", 1, size)
    offset = _number(f"{key}/offset", 1, size - 1)
    return first, (first + offset - 1) % size + 1


def _pick[T](key: str, options: Sequence[T]) -> T:
    return options[_roll(key) % len(options)]


def _number(key: str, lowest: int, highest: int) -> int:
    return lowest + _roll(key) % (highest - lowest + 1)


def _chance(key: str, probability: float) -> bool:
    return _roll(key) % 1000 < probability * 1000


def _roll(key: str) -> int:
    return int.from_bytes(hashlib.blake2b(key.encode(), digest_size=8).digest())
