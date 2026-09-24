from dataclasses import dataclass

from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import Sex
from family_tree.domain.errors import InvalidInput
from family_tree.domain.identifiers import PersonId
from family_tree.domain.people import Person
from family_tree.domain.relationships import ParentLink, Partnership

MAX_ANCESTOR_GENERATIONS = 8
MAX_DESCENDANT_GENERATIONS = 6
MAX_PAGE_SIZE = 100
MAX_SEARCH_LENGTH = 100


@dataclass(frozen=True, slots=True, kw_only=True)
class PersonSummary:
    id: PersonId
    given_names: str
    surname: str
    sex: Sex
    birth_date: GenealogicalDate | None
    death_date: GenealogicalDate | None
    is_deceased: bool
    has_photo: bool


@dataclass(frozen=True, slots=True, kw_only=True)
class PeopleQuery:
    text: str
    offset: int
    limit: int

    def __post_init__(self) -> None:
        _require_within("offset", self.offset, 0, 1_000_000)
        _require_within("limit", self.limit, 1, MAX_PAGE_SIZE)
        _require_within("search", len(self.text), 0, MAX_SEARCH_LENGTH)


@dataclass(frozen=True, slots=True, kw_only=True)
class PeoplePage:
    total: int
    people: tuple[PersonSummary, ...]


@dataclass(frozen=True, slots=True, kw_only=True)
class ParentRelation:
    link: ParentLink
    relative: PersonSummary


@dataclass(frozen=True, slots=True, kw_only=True)
class PartnerRelation:
    partnership: Partnership
    partner: PersonSummary


@dataclass(frozen=True, slots=True, kw_only=True)
class PersonDossier:
    person: Person
    has_photo: bool
    parents: tuple[ParentRelation, ...]
    children: tuple[ParentRelation, ...]
    partnerships: tuple[PartnerRelation, ...]


@dataclass(frozen=True, slots=True, kw_only=True)
class ChartScope:
    focus_id: PersonId
    ancestor_generations: int
    descendant_generations: int

    def __post_init__(self) -> None:
        _require_within("ancestors", self.ancestor_generations, 0, MAX_ANCESTOR_GENERATIONS)
        _require_within("descendants", self.descendant_generations, 0, MAX_DESCENDANT_GENERATIONS)


@dataclass(frozen=True, slots=True, kw_only=True)
class FamilyChart:
    focus_id: PersonId
    people: tuple[PersonSummary, ...]
    parent_links: tuple[ParentLink, ...]
    partnerships: tuple[Partnership, ...]


def _require_within(field: str, number: int, lowest: int, highest: int) -> None:
    if not lowest <= number <= highest:
        message = f"Must be between {lowest} and {highest}."
        raise InvalidInput("validation.out_of_range", message, {field: [message]})
