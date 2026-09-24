from collections.abc import Mapping, Sequence

from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.kinship_rules import FamilyBirths, ensure_birth_fits_family, ensure_profile_plausible
from family_tree.domain.people import Person, PersonProfile
from family_tree.domain.ports import (
    ParentLinkRepository,
    PartnershipRepository,
    PersonRepository,
    PhotoStore,
    UnitOfWork,
)
from family_tree.domain.read_models import (
    ParentRelation,
    PartnerRelation,
    PeoplePage,
    PeopleQuery,
    PersonDossier,
    PersonSummary,
)
from family_tree.domain.relationships import ParentLink, Partnership
from family_tree.domain.services.workspaces import WorkspaceService
from family_tree.domain.workspaces import Principal, ensure_room_for


class PeopleService:
    def __init__(
        self,
        *,
        unit_of_work: UnitOfWork,
        workspaces: WorkspaceService,
        people: PersonRepository,
        parent_links: ParentLinkRepository,
        partnerships: PartnershipRepository,
        photos: PhotoStore,
    ) -> None:
        self._unit_of_work = unit_of_work
        self._workspaces = workspaces
        self._people = people
        self._parent_links = parent_links
        self._partnerships = partnerships
        self._photos = photos

    def search(self, principal: Principal, query: PeopleQuery) -> PeoplePage:
        return self._people.search(self._workspaces.tree_of(principal).id, query)

    def dossier(self, principal: Principal, person_id: PersonId) -> PersonDossier:
        tree_id = self._workspaces.tree_of(principal).id
        person = self._people.get(tree_id, person_id)
        parents = self._parent_links.parents_of(tree_id, person_id)
        children = self._parent_links.children_of(tree_id, person_id)
        partnerships = self._partnerships.of_person(tree_id, person_id)
        relative_ids = _relative_ids(person_id, [*parents, *children], partnerships)
        relatives = {summary.id: summary for summary in self._people.summaries(tree_id, relative_ids)}
        return PersonDossier(
            person=person,
            has_photo=self._photos.has_photo(tree_id, person_id),
            parents=tuple(ParentRelation(link=link, relative=relatives[link.parent_id]) for link in parents),
            children=tuple(ParentRelation(link=link, relative=relatives[link.child_id]) for link in children),
            partnerships=_partner_relations(person_id, partnerships, relatives),
        )

    def create(self, principal: Principal, profile: PersonProfile) -> Person:
        ensure_profile_plausible(profile)
        tree = self._workspaces.tree_of(principal)
        with self._unit_of_work:
            ensure_room_for(tree, self._people.count(tree.id), 1)
            person = self._people.add(tree.id, profile)
            self._unit_of_work.commit()
        return person

    def update(self, principal: Principal, person_id: PersonId, profile: PersonProfile) -> Person:
        ensure_profile_plausible(profile)
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            self._people.get(tree_id, person_id)
            ensure_birth_fits_family(profile.birth_date(), self._family_births(tree_id, person_id))
            person = Person(id=person_id, tree_id=tree_id, profile=profile)
            self._people.update(person)
            self._unit_of_work.commit()
        return person

    def delete(self, principal: Principal, person_id: PersonId) -> None:
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            self._people.get(tree_id, person_id)
            self._people.delete(tree_id, person_id)
            self._unit_of_work.commit()

    def _family_births(self, tree_id: TreeId, person_id: PersonId) -> FamilyBirths:
        parent_ids = [link.parent_id for link in self._parent_links.parents_of(tree_id, person_id)]
        child_ids = [link.child_id for link in self._parent_links.children_of(tree_id, person_id)]
        births = {
            summary.id: summary.birth_date
            for summary in self._people.summaries(tree_id, parent_ids + child_ids)
        }
        return FamilyBirths(
            parents=tuple(birth for parent_id in parent_ids if (birth := births[parent_id]) is not None),
            children=tuple(birth for child_id in child_ids if (birth := births[child_id]) is not None),
        )


def _relative_ids(
    person_id: PersonId, links: Sequence[ParentLink], partnerships: Sequence[Partnership]
) -> list[PersonId]:
    linked = {link.parent_id for link in links} | {link.child_id for link in links}
    partners = {partnership.partner_of(person_id) for partnership in partnerships}
    return sorted((linked | partners) - {person_id})


def _partner_relations(
    person_id: PersonId, partnerships: Sequence[Partnership], relatives: Mapping[PersonId, PersonSummary]
) -> tuple[PartnerRelation, ...]:
    return tuple(
        PartnerRelation(partnership=partnership, partner=relatives[partnership.partner_of(person_id)])
        for partnership in partnerships
    )
