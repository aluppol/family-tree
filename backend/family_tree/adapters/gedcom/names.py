from dataclasses import dataclass

from family_tree.adapters.gedcom.mapped import Mapped, skipped_at
from family_tree.adapters.gedcom.nodes import GedcomNode
from family_tree.domain.interchange import SkippedRecord
from family_tree.domain.people import MAX_NAME_LENGTH


@dataclass(frozen=True, slots=True, kw_only=True)
class PersonName:
    given_names: str
    surname: str


UNKNOWN_NAME = PersonName(given_names="Unknown", surname="")
_NO_NAME = PersonName(given_names="", surname="")


def map_name(individual: GedcomNode, key: str) -> Mapped[PersonName]:
    names = individual.children_tagged("NAME")
    primary = _primary_name(names[0] if names else None, key)
    return Mapped(primary.value, (*primary.skipped, *_other_names(names[1:], key)))


def _primary_name(name: GedcomNode | None, key: str) -> Mapped[PersonName]:
    parts = _NO_NAME if name is None else _name_parts(name)
    if not (parts.given_names or parts.surname):
        reason = f"The person has no name, so they are imported as '{UNKNOWN_NAME.given_names}'."
        return Mapped(UNKNOWN_NAME, skipped_at(f"{key} NAME", reason))
    if max(len(parts.given_names), len(parts.surname)) <= MAX_NAME_LENGTH:
        return Mapped(parts)
    shortened = PersonName(given_names=_shortened(parts.given_names), surname=_shortened(parts.surname))
    reason = f"The name is shortened to {MAX_NAME_LENGTH} characters per part."
    return Mapped(shortened, skipped_at(f"{key} NAME", reason))


def _name_parts(name: GedcomNode) -> PersonName:
    before_surname, _, remainder = name.value.partition("/")
    surname, _, after_surname = remainder.partition("/")
    before_surname, after_surname = before_surname.strip(), after_surname.strip()
    given_names = name.child_text("GIVN").strip() or before_surname or after_surname
    suffix = name.child_text("NSFX").strip() or (after_surname if before_surname else "")
    full_surname = " ".join(part for part in (_surname(name, surname.strip()), suffix) if part)
    return PersonName(given_names=given_names, surname=full_surname)


def _surname(name: GedcomNode, surname_in_value: str) -> str:
    surname = name.child_text("SURN").strip()
    if not surname:
        return surname_in_value
    return " ".join(part for part in (name.child_text("SPFX").strip(), surname) if part)


def _other_names(names: tuple[GedcomNode, ...], key: str) -> tuple[SkippedRecord, ...]:
    return tuple(
        SkippedRecord(
            location=f"{key} NAME", reason=f"Only the first name is imported; '{name.value}' is skipped."
        )
        for name in names
    )


def _shortened(text: str) -> str:
    return text[:MAX_NAME_LENGTH].rstrip()
