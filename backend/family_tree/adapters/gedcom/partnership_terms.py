from family_tree.adapters.gedcom.events import map_event_date, map_life_event
from family_tree.adapters.gedcom.family_events import first_event_where, is_partnership_start, is_separation
from family_tree.adapters.gedcom.mapped import Mapped
from family_tree.adapters.gedcom.nodes import GedcomNode
from family_tree.domain.enums import PartnershipEndReason, PartnershipKind
from family_tree.domain.people import LifeEvent
from family_tree.domain.relationships import PartnershipEnd, PartnershipTerms


def map_partnership_terms(family: GedcomNode, key: str) -> Mapped[PartnershipTerms]:
    marriage = family.first_child("MARR")
    start = _partnership_start(family, key) if marriage is None else map_life_event(marriage, f"{key} MARR")
    end = _partnership_end(family, key)
    kind = PartnershipKind.PARTNERSHIP if marriage is None else PartnershipKind.MARRIAGE
    return Mapped(
        PartnershipTerms(kind=kind, start=start.value, end=end.value), (*start.skipped, *end.skipped)
    )


def _partnership_start(family: GedcomNode, key: str) -> Mapped[LifeEvent]:
    start_event = first_event_where(family, is_partnership_start)
    return map_life_event(start_event, f"{key} EVEN")


def _partnership_end(family: GedcomNode, key: str) -> Mapped[PartnershipEnd | None]:
    endings = (
        (family.first_child("DIV"), PartnershipEndReason.DIVORCE),
        (family.first_child("ANUL"), PartnershipEndReason.ANNULMENT),
        (first_event_where(family, is_separation), PartnershipEndReason.SEPARATION),
    )
    ending = next(((event, reason) for event, reason in endings if event is not None), None)
    if ending is None:
        return Mapped(None)
    event, reason = ending
    date = map_event_date(event, f"{key} {event.tag}")
    return Mapped(PartnershipEnd(reason=reason, date=date.value), date.skipped)
