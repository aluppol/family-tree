from family_tree.domain.identifiers import PersonId
from family_tree.domain.photos import Photo, photo_from_bytes
from family_tree.domain.ports import PersonRepository, PhotoStore, UnitOfWork
from family_tree.domain.services.workspaces import WorkspaceService
from family_tree.domain.workspaces import Principal


class PhotoService:
    def __init__(
        self,
        *,
        unit_of_work: UnitOfWork,
        workspaces: WorkspaceService,
        people: PersonRepository,
        photos: PhotoStore,
    ) -> None:
        self._unit_of_work = unit_of_work
        self._workspaces = workspaces
        self._people = people
        self._photos = photos

    def photo(self, principal: Principal, person_id: PersonId) -> Photo:
        tree_id = self._workspaces.tree_of(principal).id
        self._people.get(tree_id, person_id)
        return self._photos.load(tree_id, person_id)

    def replace_photo(self, principal: Principal, person_id: PersonId, content: bytes) -> None:
        photo = photo_from_bytes(content)
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            self._people.get(tree_id, person_id)
            self._photos.save(tree_id, person_id, photo)
            self._unit_of_work.commit()

    def remove_photo(self, principal: Principal, person_id: PersonId) -> None:
        tree_id = self._workspaces.tree_of(principal).id
        with self._unit_of_work:
            self._people.get(tree_id, person_id)
            self._photos.delete(tree_id, person_id)
            self._unit_of_work.commit()
