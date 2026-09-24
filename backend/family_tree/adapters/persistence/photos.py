from collections.abc import Mapping

from django.db.models import QuerySet
from django.db.models.functions import Now

from family_tree.adapters.persistence.mappers import PhotoMapper
from family_tree.adapters.persistence.models import PersonPhotoRecord
from family_tree.domain.errors import NotFound
from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.photos import Photo


class DjangoPhotoStore:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def save(self, tree_id: TreeId, person_id: PersonId, photo: Photo) -> None:
        columns = {"tree_id": tree_id, "media_type": photo.media_type.value, "content": photo.content}
        self._records().update_or_create(person_id=person_id, defaults={**columns, "updated_at": Now()})

    def load(self, tree_id: TreeId, person_id: PersonId) -> Photo:
        record = self._in_tree(tree_id).filter(person_id=person_id).first()
        if record is None:
            raise NotFound("photo.not_found", "This person has no photo.")
        return PhotoMapper.to_photo(record)

    def delete(self, tree_id: TreeId, person_id: PersonId) -> None:
        self._in_tree(tree_id).filter(person_id=person_id).delete()

    def has_photo(self, tree_id: TreeId, person_id: PersonId) -> bool:
        return self._in_tree(tree_id).filter(person_id=person_id).exists()

    def all(self, tree_id: TreeId) -> Mapping[PersonId, Photo]:
        return {PersonId(record.person_id): PhotoMapper.to_photo(record) for record in self._in_tree(tree_id)}

    def _records(self) -> QuerySet[PersonPhotoRecord]:
        return PersonPhotoRecord.objects.using(self._database)

    def _in_tree(self, tree_id: TreeId) -> QuerySet[PersonPhotoRecord]:
        return self._records().filter(tree_id=tree_id)
