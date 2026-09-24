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
    usable = _usable_name(_name_parts(names[0]) if names else _NO_NAME, key)
    return Mapped(usable.value, (*usable.skipped, *_other_names(names[1:], key)))


def _usable_name(parts: PersonName, key: str) -> Mapped[PersonName]:
    if not (parts.given_names or parts.surname):
        reason = f"The person has no name, so they are imported as '{UNKNOWN_NAME.given_names}'."
        return Mapped(UNKNOWN_NAME, skipped_at(f"{key} NAME", reason))
    if max(len(parts.given_names), len(parts.surname)) <= MAX_NAME_LENGTH:
        return Mapped(parts)
    shortened = PersonName(given_names=_shortened(parts.given_names), surname=_shortened(parts.surname))
    reason = f"The name is shortened to {MAX_NAME_LENGTH} characters per part."
    return Mapped(shortened, skipped_at(f"{key} NAME", reason))


def _name_parts(name: GedcomNode) -> PersonName:
    given_in_value, surname_in_value = _value_parts(name.value, name.child_text("NSFX").strip())
    given_names = name.child_text("GIVN").strip() or given_in_value
    return PersonName(given_names=given_names, surname=_surname_pieces(name) or surname_in_value)


def _value_parts(value: str, suffix_piece: str) -> tuple[str, str]:
    before_surname, _, remainder = value.partition("/")
    surname, _, after_surname = remainder.partition("/")
    before_surname, after_surname = before_surname.strip(), after_surname.strip()
    suffix = suffix_piece or (after_surname if before_surname else "")
    return before_surname or after_surname, _joined(surname.strip(), suffix)


def _surname_pieces(name: GedcomNode) -> str:
    surname = name.child_text("SURN").strip()
    if not surname:
        return ""
    return _joined(name.child_text("SPFX").strip(), surname, name.child_text("NSFX").strip())


def _joined(*parts: str) -> str:
    return " ".join(part for part in parts if part)


def _other_names(names: tuple[GedcomNode, ...], key: str) -> tuple[SkippedRecord, ...]:
    return tuple(
        SkippedRecord(
            location=f"{key} NAME", reason=f"Only the first name is imported; '{name.value}' is skipped."
        )
        for name in names
    )


def _shortened(text: str) -> str:
    return text[:MAX_NAME_LENGTH].rstrip()
