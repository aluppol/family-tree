from collections.abc import Mapping
from dataclasses import dataclass

from family_tree.domain.enums import ParentLinkKind
from family_tree.domain.identifiers import PersonId
from family_tree.domain.people import Person, PersonProfile
from family_tree.domain.photos import Photo
from family_tree.domain.relationships import ParentLink, Partnership, PartnershipTerms


@dataclass(frozen=True, slots=True, kw_only=True)
class InterchangePerson:
    key: str
    profile: PersonProfile
    photo: Photo | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class InterchangeParentLink:
    parent_key: str
    child_key: str
    kind: ParentLinkKind


@dataclass(frozen=True, slots=True, kw_only=True)
class InterchangePartnership:
    first_partner_key: str
    second_partner_key: str
    terms: PartnershipTerms


@dataclass(frozen=True, slots=True, kw_only=True)
class SkippedRecord:
    location: str
    reason: str


@dataclass(frozen=True, slots=True, kw_only=True)
class InterchangeDocument:
    people: tuple[InterchangePerson, ...]
    parent_links: tuple[InterchangeParentLink, ...]
    partnerships: tuple[InterchangePartnership, ...]
    skipped: tuple[SkippedRecord, ...]


@dataclass(frozen=True, slots=True, kw_only=True)
class TreeSnapshot:
    people: tuple[Person, ...]
    parent_links: tuple[ParentLink, ...]
    partnerships: tuple[Partnership, ...]
    photos: Mapping[PersonId, Photo]


@dataclass(frozen=True, slots=True, kw_only=True)
class ImportReport:
    people_count: int
    parent_link_count: int
    partnership_count: int
    photo_count: int
    skipped: tuple[SkippedRecord, ...]


@dataclass(frozen=True, slots=True, kw_only=True)
class ImportOutcome:
    report: ImportReport
    home_person_id: PersonId | None
