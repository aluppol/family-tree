from collections.abc import Sequence

from family_tree.adapters.gedcom.date_values import parse_gedcom_date
from family_tree.adapters.gedcom.mapped import Mapped, skipped_at
from family_tree.adapters.gedcom.nodes import GedcomNode
from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import DateQualifier
from family_tree.domain.errors import InvalidInput
from family_tree.domain.people import MAX_PLACE_LENGTH, LifeEvent


def map_life_event(event: GedcomNode | None, location: str) -> Mapped[LifeEvent]:
    date = map_event_date(event, location)
    place = map_event_place(event, location)
    return Mapped(LifeEvent(date=date.value, place=place.value), (*date.skipped, *place.skipped))


def map_event_date(event: GedcomNode | None, location: str) -> Mapped[GenealogicalDate | None]:
    text = "" if event is None else event.child_text("DATE").strip()
    if not text:
        return Mapped(None)
    try:
        date = parse_gedcom_date(text)
    except InvalidInput as error:
        reason = f"The date '{text}' is not imported. {error.message}"
        return Mapped(None, skipped_at(f"{location} DATE", reason))
    return Mapped(date)


def map_event_place(event: GedcomNode | None, location: str) -> Mapped[str]:
    place = "" if event is None else event.child_text("PLAC").strip()
    if len(place) <= MAX_PLACE_LENGTH:
        return Mapped(place)
    reason = f"The place is shortened to {MAX_PLACE_LENGTH} characters."
    return Mapped(place[:MAX_PLACE_LENGTH].rstrip(), skipped_at(f"{location} PLAC", reason))


def latest_bound_before(events: Sequence[GedcomNode]) -> GenealogicalDate | None:
    dates = (_date_or_none(event) for event in events)
    bounding = next(
        (date for date in dates if date is not None and date.qualifier is not DateQualifier.AFTER), None
    )
    if bounding is None:
        return None
    return GenealogicalDate(
        DateQualifier.BEFORE, bounding.value if bounding.until is None else bounding.until
    )


def _date_or_none(event: GedcomNode) -> GenealogicalDate | None:
    try:
        date = parse_gedcom_date(event.child_text("DATE"))
    except InvalidInput:
        return None
    return date
