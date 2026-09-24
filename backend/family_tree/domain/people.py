from dataclasses import dataclass

from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import Sex
from family_tree.domain.errors import InvalidInput
from family_tree.domain.identifiers import PersonId, TreeId

MAX_NAME_LENGTH = 120
MAX_PLACE_LENGTH = 200
MAX_BIOGRAPHY_LENGTH = 10_000


@dataclass(frozen=True, slots=True, kw_only=True)
class LifeEvent:
    date: GenealogicalDate | None = None
    place: str = ""

    def __post_init__(self) -> None:
        _require_at_most("place", self.place, MAX_PLACE_LENGTH)


@dataclass(frozen=True, slots=True, kw_only=True)
class PersonProfile:
    given_names: str
    surname: str
    sex: Sex
    birth: LifeEvent
    death: LifeEvent | None
    biography: str

    def __post_init__(self) -> None:
        _require_a_name(self.given_names, self.surname)
        _require_at_most("given_names", self.given_names, MAX_NAME_LENGTH)
        _require_at_most("surname", self.surname, MAX_NAME_LENGTH)
        _require_at_most("biography", self.biography, MAX_BIOGRAPHY_LENGTH)

    def full_name(self) -> str:
        return " ".join(name for name in (self.given_names, self.surname) if name)

    def birth_date(self) -> GenealogicalDate | None:
        return self.birth.date

    def death_date(self) -> GenealogicalDate | None:
        return None if self.death is None else self.death.date

    def is_deceased(self) -> bool:
        return self.death is not None


@dataclass(frozen=True, slots=True, kw_only=True)
class Person:
    id: PersonId
    tree_id: TreeId
    profile: PersonProfile


def _require_a_name(given_names: str, surname: str) -> None:
    if not (given_names.strip() or surname.strip()):
        message = "Give at least a given name or a surname."
        raise InvalidInput("validation.name_required", message, {"given_names": [message]})


def _require_at_most(field: str, text: str, limit: int) -> None:
    if len(text) > limit:
        message = f"At most {limit} characters."
        raise InvalidInput("validation.too_long", message, {field: [message]})
