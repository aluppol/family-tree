from collections import defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from operator import attrgetter

from family_tree.adapters.gedcom.export_dialect import ExportDialect
from family_tree.adapters.gedcom.family_events import PARTNERSHIP_TYPE, SEPARATION_TYPE
from family_tree.adapters.gedcom.family_plan import PlannedFamily, plan_families
from family_tree.adapters.gedcom.structures import Structure, individual_xref, media_xref
from family_tree.domain.date_notation import format_date_notation
from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import ParentLinkKind, PartnershipEndReason, PartnershipKind, PhotoType
from family_tree.domain.identifiers import PersonId
from family_tree.domain.interchange import TreeSnapshot
from family_tree.domain.people import LifeEvent, Person, PersonProfile
from family_tree.domain.relationships import PartnershipEnd, PartnershipTerms

TRAILER = Structure(tag="TRLR")
ASSERTED = "Y"
_END_TAGS = {PartnershipEndReason.DIVORCE: "DIV", PartnershipEndReason.ANNULMENT: "ANUL"}


@dataclass(frozen=True, slots=True, kw_only=True)
class MediaFile:
    person_id: PersonId
    path: str
    media_type: PhotoType


@dataclass(frozen=True, slots=True, kw_only=True)
class _Memberships:
    as_child: Mapping[PersonId, list[tuple[str, ParentLinkKind]]]
    as_partner: Mapping[PersonId, list[str]]


def export_records(
    snapshot: TreeSnapshot, dialect: ExportDialect, media_files: Mapping[PersonId, MediaFile]
) -> tuple[Structure, ...]:
    families = plan_families(snapshot)
    memberships = _memberships(families)
    people = sorted(snapshot.people, key=attrgetter("id"))
    return (
        *dialect.header,
        *(_individual(person, memberships, dialect, media_files.get(person.id)) for person in people),
        *(_family(family) for family in families),
        *(_media(media_files[person_id]) for person_id in sorted(media_files)),
        TRAILER,
    )


def _individual(
    person: Person, memberships: _Memberships, dialect: ExportDialect, media_file: MediaFile | None
) -> Structure:
    profile = person.profile
    return Structure(
        tag="INDI",
        xref=individual_xref(person.id),
        children=(
            _name(profile),
            Structure(tag="SEX", text=dialect.sex_codes[profile.sex]),
            *_life_event("BIRT", profile.birth),
            *_death(profile.death),
            *_note(profile.biography),
            *_child_links(memberships.as_child.get(person.id, []), dialect),
            *(Structure(tag="FAMS", pointer=xref) for xref in memberships.as_partner.get(person.id, [])),
            *_media_link(media_file),
        ),
    )


def _name(profile: PersonProfile) -> Structure:
    surname = f"/{profile.surname}/" if profile.surname else ""
    return Structure(
        tag="NAME",
        text=" ".join(part for part in (profile.given_names, surname) if part),
        children=(*_optional("GIVN", profile.given_names), *_optional("SURN", profile.surname)),
    )


def _life_event(tag: str, event: LifeEvent) -> tuple[Structure, ...]:
    details = (*_date(event.date), *_optional("PLAC", event.place))
    return (Structure(tag=tag, children=details),) if details else ()


def _death(death: LifeEvent | None) -> tuple[Structure, ...]:
    if death is None:
        return ()
    return _life_event("DEAT", death) or (Structure(tag="DEAT", text=ASSERTED),)


def _note(biography: str) -> tuple[Structure, ...]:
    return (Structure(tag="NOTE", text=biography),) if biography else ()


def _child_links(
    links: Sequence[tuple[str, ParentLinkKind]], dialect: ExportDialect
) -> tuple[Structure, ...]:
    return tuple(
        Structure(tag="FAMC", pointer=xref, children=_optional("PEDI", dialect.pedigree_codes.get(kind, "")))
        for xref, kind in links
    )


def _media_link(media_file: MediaFile | None) -> tuple[Structure, ...]:
    return () if media_file is None else (Structure(tag="OBJE", pointer=media_xref(media_file.person_id)),)


def _family(family: PlannedFamily) -> Structure:
    return Structure(
        tag="FAM",
        xref=family.xref,
        children=(
            *_partner("HUSB", family.husband_id),
            *_partner("WIFE", family.wife_id),
            *(Structure(tag="CHIL", pointer=individual_xref(child.child_id)) for child in family.children),
            *_partnership_events(family.terms),
        ),
    )


def _partner(tag: str, person_id: PersonId | None) -> tuple[Structure, ...]:
    return () if person_id is None else (Structure(tag=tag, pointer=individual_xref(person_id)),)


def _partnership_events(terms: PartnershipTerms | None) -> tuple[Structure, ...]:
    if terms is None:
        return ()
    return (*_partnership_start(terms), *_partnership_end(terms.end))


def _partnership_start(terms: PartnershipTerms) -> tuple[Structure, ...]:
    if terms.kind is PartnershipKind.MARRIAGE:
        return _life_event("MARR", terms.start) or (Structure(tag="MARR", text=ASSERTED),)
    details = (*_date(terms.start.date), *_optional("PLAC", terms.start.place))
    return _typed_event(PARTNERSHIP_TYPE, details) if details else ()


def _partnership_end(end: PartnershipEnd | None) -> tuple[Structure, ...]:
    if end is None:
        return ()
    if end.reason is PartnershipEndReason.SEPARATION:
        return _typed_event(SEPARATION_TYPE, _date(end.date))
    text = "" if end.date is not None else ASSERTED
    return (Structure(tag=_END_TAGS[end.reason], text=text, children=_date(end.date)),)


def _typed_event(event_type: str, details: tuple[Structure, ...]) -> tuple[Structure, ...]:
    return (
        Structure(tag="EVEN", text=event_type, children=(Structure(tag="TYPE", text=event_type), *details)),
    )


def _media(media_file: MediaFile) -> Structure:
    file = Structure(
        tag="FILE", text=media_file.path, children=(Structure(tag="FORM", text=media_file.media_type),)
    )
    return Structure(tag="OBJE", xref=media_xref(media_file.person_id), children=(file,))


def _date(date: GenealogicalDate | None) -> tuple[Structure, ...]:
    return () if date is None else (Structure(tag="DATE", text=format_date_notation(date)),)


def _optional(tag: str, text: str) -> tuple[Structure, ...]:
    return (Structure(tag=tag, text=text),) if text else ()


def _memberships(families: Sequence[PlannedFamily]) -> _Memberships:
    as_child: defaultdict[PersonId, list[tuple[str, ParentLinkKind]]] = defaultdict(list)
    as_partner: defaultdict[PersonId, list[str]] = defaultdict(list)
    for family in families:
        for child in family.children:
            as_child[child.child_id].append((family.xref, child.kind))
        for partner_id in family.partner_ids():
            as_partner[partner_id].append(family.xref)
    return _Memberships(as_child=as_child, as_partner=as_partner)
