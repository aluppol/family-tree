from collections.abc import Callable

from family_tree.adapters.gedcom.nodes import GedcomNode

SEPARATION_TYPE = "Separation"
PARTNERSHIP_TYPE = "Partnership"
_SEPARATION_TYPES = frozenset({"separation", "separated"})
_PARTNERSHIP_TYPES = frozenset({"partnership"})


def is_separation(event: GedcomNode) -> bool:
    return event.tag == "EVEN" and _event_type(event) in _SEPARATION_TYPES


def is_partnership_start(event: GedcomNode) -> bool:
    return event.tag == "EVEN" and _event_type(event) in _PARTNERSHIP_TYPES


def first_event_where(family: GedcomNode, is_wanted: Callable[[GedcomNode], bool]) -> GedcomNode | None:
    return next((event for event in family.children if is_wanted(event)), None)


def _event_type(event: GedcomNode) -> str:
    return event.child_text("TYPE").strip().casefold()
