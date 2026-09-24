from collections.abc import Sequence

from django.db.models import QuerySet
from django.db.models.functions import Now

from family_tree.adapters.persistence.mappers import PersonMapper
from family_tree.adapters.persistence.models import PersonRecord
from family_tree.adapters.persistence.summaries import NAME_ORDER, name_matches, summaries_of
from family_tree.domain.errors import NotFound
from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.people import Person, PersonProfile
from family_tree.domain.read_models import PeoplePage, PeopleQuery, PersonSummary

BULK_BATCH_SIZE = 1000


class DjangoPersonRepository:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def get(self, tree_id: TreeId, person_id: PersonId) -> Person:
        record = self._in_tree(tree_id).filter(id=person_id).first()
        if record is None:
            raise NotFound("person.not_found", "This person is not in your family tree.")
        return PersonMapper.to_entity(record)

    def add(self, tree_id: TreeId, profile: PersonProfile) -> Person:
        record = PersonMapper.to_record(tree_id, profile)
        record.save(using=self._database)
        return PersonMapper.to_entity(record)

    def add_many(self, tree_id: TreeId, profiles: Sequence[PersonProfile]) -> list[Person]:
        records = [PersonMapper.to_record(tree_id, profile) for profile in profiles]
        created = PersonRecord.objects.using(self._database).bulk_create(records, batch_size=BULK_BATCH_SIZE)
        return [PersonMapper.to_entity(record) for record in created]

    def update(self, person: Person) -> None:
        columns = PersonMapper.to_columns(person.profile)
        self._in_tree(person.tree_id).filter(id=person.id).update(**columns, updated_at=Now())

    def delete(self, tree_id: TreeId, person_id: PersonId) -> None:
        self._in_tree(tree_id).filter(id=person_id).delete()

    def count(self, tree_id: TreeId) -> int:
        return self._in_tree(tree_id).count()

    def search(self, tree_id: TreeId, query: PeopleQuery) -> PeoplePage:
        matching = self._in_tree(tree_id).filter(name_matches(query.text))
        page = matching.order_by(*NAME_ORDER)[query.offset : query.offset + query.limit]
        return PeoplePage(total=matching.count(), people=tuple(summaries_of(page)))

    def summaries(self, tree_id: TreeId, person_ids: Sequence[PersonId]) -> list[PersonSummary]:
        return summaries_of(self._in_tree(tree_id).filter(id__in=person_ids).order_by(*NAME_ORDER))

    def first_person_id(self, tree_id: TreeId) -> PersonId | None:
        first_id = self._in_tree(tree_id).order_by(*NAME_ORDER).values_list("id", flat=True).first()
        return None if first_id is None else PersonId(first_id)

    def all(self, tree_id: TreeId) -> list[Person]:
        return [PersonMapper.to_entity(record) for record in self._in_tree(tree_id).order_by("id")]

    def _in_tree(self, tree_id: TreeId) -> QuerySet[PersonRecord]:
        return PersonRecord.objects.using(self._database).filter(tree_id=tree_id)
