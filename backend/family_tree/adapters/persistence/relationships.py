from collections.abc import Sequence

from django.db.models import Q, QuerySet

from family_tree.adapters.persistence.mappers import ParentLinkMapper, PartnershipMapper
from family_tree.adapters.persistence.models import ParentLinkRecord, PartnershipRecord
from family_tree.domain.enums import ParentLinkKind
from family_tree.domain.errors import NotFound
from family_tree.domain.identifiers import ParentLinkId, PartnershipId, PersonId, TreeId
from family_tree.domain.relationships import ParentLink, Partnership, PartnershipTerms

BULK_BATCH_SIZE = 1000
CHILD_ORDER = ("child__birth_sort_date", "child_id")
PARTNERSHIP_ORDER = ("start_sort_date", "id")


class DjangoParentLinkRepository:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def get(self, tree_id: TreeId, link_id: ParentLinkId) -> ParentLink:
        record = self._in_tree(tree_id).filter(id=link_id).first()
        if record is None:
            raise NotFound("parent_link.not_found", "This parent link does not exist.")
        return ParentLinkMapper.to_entity(record)

    def add(
        self, tree_id: TreeId, parent_id: PersonId, child_id: PersonId, kind: ParentLinkKind
    ) -> ParentLink:
        record = ParentLinkMapper.to_record(tree_id, (parent_id, child_id, kind))
        record.save(using=self._database)
        return ParentLinkMapper.to_entity(record)

    def add_many(self, tree_id: TreeId, links: Sequence[tuple[PersonId, PersonId, ParentLinkKind]]) -> None:
        records = [ParentLinkMapper.to_record(tree_id, link) for link in links]
        ParentLinkRecord.objects.using(self._database).bulk_create(records, batch_size=BULK_BATCH_SIZE)

    def change_kind(self, link: ParentLink) -> None:
        self._in_tree(link.tree_id).filter(id=link.id).update(kind=link.kind.value)

    def delete(self, tree_id: TreeId, link_id: ParentLinkId) -> None:
        self._in_tree(tree_id).filter(id=link_id).delete()

    def parents_of(self, tree_id: TreeId, child_id: PersonId) -> list[ParentLink]:
        records = self._in_tree(tree_id).filter(child_id=child_id).order_by("id")
        return [ParentLinkMapper.to_entity(record) for record in records]

    def children_of(self, tree_id: TreeId, parent_id: PersonId) -> list[ParentLink]:
        records = self._in_tree(tree_id).filter(parent_id=parent_id).order_by(*CHILD_ORDER)
        return [ParentLinkMapper.to_entity(record) for record in records]

    def all(self, tree_id: TreeId) -> list[ParentLink]:
        return [ParentLinkMapper.to_entity(record) for record in self._in_tree(tree_id).order_by("id")]

    def _in_tree(self, tree_id: TreeId) -> QuerySet[ParentLinkRecord]:
        return ParentLinkRecord.objects.using(self._database).filter(tree_id=tree_id)


class DjangoPartnershipRepository:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def get(self, tree_id: TreeId, partnership_id: PartnershipId) -> Partnership:
        record = self._in_tree(tree_id).filter(id=partnership_id).first()
        if record is None:
            raise NotFound("partnership.not_found", "This partnership does not exist.")
        return PartnershipMapper.to_entity(record)

    def add(
        self, tree_id: TreeId, partner_ids: tuple[PersonId, PersonId], terms: PartnershipTerms
    ) -> Partnership:
        record = PartnershipMapper.to_record(tree_id, (*partner_ids, terms))
        record.save(using=self._database)
        return PartnershipMapper.to_entity(record)

    def add_many(
        self, tree_id: TreeId, partnerships: Sequence[tuple[PersonId, PersonId, PartnershipTerms]]
    ) -> None:
        records = [PartnershipMapper.to_record(tree_id, partnership) for partnership in partnerships]
        PartnershipRecord.objects.using(self._database).bulk_create(records, batch_size=BULK_BATCH_SIZE)

    def update_terms(self, partnership: Partnership) -> None:
        columns = PartnershipMapper.to_columns(partnership.terms)
        self._in_tree(partnership.tree_id).filter(id=partnership.id).update(**columns)

    def delete(self, tree_id: TreeId, partnership_id: PartnershipId) -> None:
        self._in_tree(tree_id).filter(id=partnership_id).delete()

    def of_person(self, tree_id: TreeId, person_id: PersonId) -> list[Partnership]:
        involving = Q(first_partner_id=person_id) | Q(second_partner_id=person_id)
        records = self._in_tree(tree_id).filter(involving).order_by(*PARTNERSHIP_ORDER)
        return [PartnershipMapper.to_entity(record) for record in records]

    def all(self, tree_id: TreeId) -> list[Partnership]:
        return [PartnershipMapper.to_entity(record) for record in self._in_tree(tree_id).order_by("id")]

    def _in_tree(self, tree_id: TreeId) -> QuerySet[PartnershipRecord]:
        return PartnershipRecord.objects.using(self._database).filter(tree_id=tree_id)
