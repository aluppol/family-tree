from collections.abc import Mapping

from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.interchange import ImportOutcome, ImportReport, InterchangeDocument
from family_tree.domain.ports import ParentLinkRepository, PartnershipRepository, PersonRepository, PhotoStore


class DocumentImporter:
    def __init__(
        self,
        *,
        people: PersonRepository,
        parent_links: ParentLinkRepository,
        partnerships: PartnershipRepository,
        photos: PhotoStore,
    ) -> None:
        self._people = people
        self._parent_links = parent_links
        self._partnerships = partnerships
        self._photos = photos

    def import_document(self, tree_id: TreeId, document: InterchangeDocument) -> ImportOutcome:
        created = self._people.add_many(tree_id, [person.profile for person in document.people])
        ids_by_key = {person.key: added.id for person, added in zip(document.people, created, strict=True)}
        self._add_parent_links(tree_id, document, ids_by_key)
        self._add_partnerships(tree_id, document, ids_by_key)
        self._add_photos(tree_id, document, ids_by_key)
        return ImportOutcome(report=report_of(document), home_person_id=created[0].id if created else None)

    def _add_parent_links(
        self, tree_id: TreeId, document: InterchangeDocument, ids_by_key: Mapping[str, PersonId]
    ) -> None:
        links = [
            (ids_by_key[link.parent_key], ids_by_key[link.child_key], link.kind)
            for link in document.parent_links
        ]
        self._parent_links.add_many(tree_id, links)

    def _add_partnerships(
        self, tree_id: TreeId, document: InterchangeDocument, ids_by_key: Mapping[str, PersonId]
    ) -> None:
        partnerships = [
            (
                ids_by_key[partnership.first_partner_key],
                ids_by_key[partnership.second_partner_key],
                partnership.terms,
            )
            for partnership in document.partnerships
        ]
        self._partnerships.add_many(tree_id, partnerships)

    def _add_photos(
        self, tree_id: TreeId, document: InterchangeDocument, ids_by_key: Mapping[str, PersonId]
    ) -> None:
        for person in document.people:
            if person.photo is not None:
                self._photos.save(tree_id, ids_by_key[person.key], person.photo)


def report_of(document: InterchangeDocument) -> ImportReport:
    return ImportReport(
        people_count=len(document.people),
        parent_link_count=len(document.parent_links),
        partnership_count=len(document.partnerships),
        photo_count=sum(person.photo is not None for person in document.people),
        skipped=document.skipped,
    )
