from collections.abc import Mapping
from datetime import date
from typing import Any

from family_tree.adapters.persistence.models import (
    FamilyTreeRecord,
    ParentLinkRecord,
    PartnershipRecord,
    PersonPhotoRecord,
    PersonRecord,
)
from family_tree.domain.date_notation import format_date_notation, parse_date_notation
from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.enums import (
    OwnerKind,
    ParentLinkKind,
    PartnershipEndReason,
    PartnershipKind,
    PhotoType,
    Sex,
)
from family_tree.domain.identifiers import ParentLinkId, PartnershipId, PersonId, TreeId
from family_tree.domain.people import LifeEvent, Person, PersonProfile
from family_tree.domain.photos import Photo
from family_tree.domain.read_models import PersonSummary
from family_tree.domain.relationships import ParentLink, Partnership, PartnershipEnd, PartnershipTerms
from family_tree.domain.workspaces import FamilyTree, WorkspaceOwner

SUMMARY_COLUMNS = ("id", "given_names", "surname", "sex", "birth_date", "death_date", "is_deceased")


class FamilyTreeMapper:
    @staticmethod
    def to_entity(record: FamilyTreeRecord) -> FamilyTree:
        return FamilyTree(
            id=TreeId(record.id),
            owner=WorkspaceOwner(OwnerKind(record.owner_kind), record.owner_key),
            home_person_id=None if record.home_person_id is None else PersonId(record.home_person_id),
        )


class PersonMapper:
    @staticmethod
    def to_entity(record: PersonRecord) -> Person:
        return Person(
            id=PersonId(record.id), tree_id=TreeId(record.tree_id), profile=PersonMapper.to_profile(record)
        )

    @staticmethod
    def to_profile(record: PersonRecord) -> PersonProfile:
        death = LifeEvent(date=date_from_notation(record.death_date), place=record.death_place)
        return PersonProfile(
            given_names=record.given_names,
            surname=record.surname,
            sex=Sex(record.sex),
            birth=LifeEvent(date=date_from_notation(record.birth_date), place=record.birth_place),
            death=death if record.is_deceased else None,
            biography=record.biography,
        )

    @staticmethod
    def to_columns(profile: PersonProfile) -> dict[str, Any]:
        death = profile.death or LifeEvent()
        return {
            "given_names": profile.given_names,
            "surname": profile.surname,
            "sex": profile.sex.value,
            "birth_date": notation_of(profile.birth.date),
            "birth_sort_date": sort_date_of(profile.birth.date),
            "birth_place": profile.birth.place,
            "is_deceased": profile.is_deceased(),
            "death_date": notation_of(death.date),
            "death_place": death.place,
            "biography": profile.biography,
        }

    @staticmethod
    def to_record(tree_id: TreeId, profile: PersonProfile) -> PersonRecord:
        return PersonRecord(tree_id=tree_id, **PersonMapper.to_columns(profile))

    @staticmethod
    def summary_from_row(row: Mapping[str, Any]) -> PersonSummary:
        return PersonSummary(
            id=PersonId(row["id"]),
            given_names=row["given_names"],
            surname=row["surname"],
            sex=Sex(row["sex"]),
            birth_date=date_from_notation(row["birth_date"]),
            death_date=date_from_notation(row["death_date"]),
            is_deceased=row["is_deceased"],
            has_photo=row["has_photo"],
        )


class ParentLinkMapper:
    @staticmethod
    def to_entity(record: ParentLinkRecord) -> ParentLink:
        return ParentLink(
            id=ParentLinkId(record.id),
            tree_id=TreeId(record.tree_id),
            parent_id=PersonId(record.parent_id),
            child_id=PersonId(record.child_id),
            kind=ParentLinkKind(record.kind),
        )

    @staticmethod
    def to_record(tree_id: TreeId, link: tuple[PersonId, PersonId, ParentLinkKind]) -> ParentLinkRecord:
        parent_id, child_id, kind = link
        return ParentLinkRecord(tree_id=tree_id, parent_id=parent_id, child_id=child_id, kind=kind.value)


class PartnershipMapper:
    @staticmethod
    def to_entity(record: PartnershipRecord) -> Partnership:
        return Partnership(
            id=PartnershipId(record.id),
            tree_id=TreeId(record.tree_id),
            first_partner_id=PersonId(record.first_partner_id),
            second_partner_id=PersonId(record.second_partner_id),
            terms=PartnershipMapper.to_terms(record),
        )

    @staticmethod
    def to_terms(record: PartnershipRecord) -> PartnershipTerms:
        end = None
        if record.end_reason is not None:
            end = PartnershipEnd(
                reason=PartnershipEndReason(record.end_reason), date=date_from_notation(record.end_date)
            )
        return PartnershipTerms(
            kind=PartnershipKind(record.kind),
            start=LifeEvent(date=date_from_notation(record.start_date), place=record.start_place),
            end=end,
        )

    @staticmethod
    def to_columns(terms: PartnershipTerms) -> dict[str, Any]:
        return {
            "kind": terms.kind.value,
            "start_date": notation_of(terms.start.date),
            "start_sort_date": sort_date_of(terms.start.date),
            "start_place": terms.start.place,
            "end_reason": None if terms.end is None else terms.end.reason.value,
            "end_date": None if terms.end is None else notation_of(terms.end.date),
        }

    @staticmethod
    def to_record(
        tree_id: TreeId, partnership: tuple[PersonId, PersonId, PartnershipTerms]
    ) -> PartnershipRecord:
        first_partner_id, second_partner_id, terms = partnership
        return PartnershipRecord(
            tree_id=tree_id,
            first_partner_id=first_partner_id,
            second_partner_id=second_partner_id,
            **PartnershipMapper.to_columns(terms),
        )


class PhotoMapper:
    @staticmethod
    def to_photo(record: PersonPhotoRecord) -> Photo:
        return Photo(PhotoType(record.media_type), bytes(record.content))


def date_from_notation(notation: str | None) -> GenealogicalDate | None:
    return None if notation is None else parse_date_notation(notation)


def notation_of(genealogical_date: GenealogicalDate | None) -> str | None:
    return None if genealogical_date is None else format_date_notation(genealogical_date)


def sort_date_of(genealogical_date: GenealogicalDate | None) -> date | None:
    return None if genealogical_date is None else genealogical_date.sort_key()
