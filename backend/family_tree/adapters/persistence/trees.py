from django.db import IntegrityError, transaction
from django.db.models import QuerySet

from family_tree.adapters.persistence.mappers import FamilyTreeMapper
from family_tree.adapters.persistence.models import FamilyTreeRecord
from family_tree.domain.enums import OwnerKind
from family_tree.domain.errors import NotFound, WorkspaceAlreadyExists
from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.workspaces import FamilyTree, WorkspaceOwner


class DjangoFamilyTreeRepository:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def find_by_owner(self, owner: WorkspaceOwner) -> FamilyTree | None:
        record = self._records().filter(owner_kind=owner.kind.value, owner_key=owner.key).first()
        return None if record is None else FamilyTreeMapper.to_entity(record)

    def add(self, owner: WorkspaceOwner) -> FamilyTree:
        try:
            with transaction.atomic(using=self._database):
                record = self._records().create(owner_kind=owner.kind.value, owner_key=owner.key)
        except IntegrityError as error:
            raise WorkspaceAlreadyExists("workspace.exists", "This family tree already exists.") from error
        return FamilyTreeMapper.to_entity(record)

    def lock(self, tree_id: TreeId) -> None:
        if not self._records().select_for_update(no_key=True).filter(id=tree_id).exists():
            raise NotFound(
                "workspace.not_found", "Your family tree was reset; reload the page to start again."
            )

    def set_home_person(self, tree_id: TreeId, person_id: PersonId | None) -> None:
        self._records().filter(id=tree_id).update(home_person_id=person_id)

    def count_guest_workspaces(self) -> int:
        return self._guest_records().count()

    def delete_guest_workspaces(self) -> None:
        self._delete_locked(self._guest_records().select_for_update())

    def delete_oldest_guest_workspaces(self, keep: int) -> None:
        newest_first = self._guest_records().order_by("-created_at", "-id")
        stale_ids = list(newest_first.values_list("id", flat=True)[keep:])
        self._delete_locked(self._records().filter(id__in=stale_ids).select_for_update(skip_locked=True))

    def _records(self) -> QuerySet[FamilyTreeRecord]:
        return FamilyTreeRecord.objects.using(self._database)

    def _guest_records(self) -> QuerySet[FamilyTreeRecord]:
        return self._records().filter(owner_kind=OwnerKind.GUEST.value)

    def _delete_locked(self, trees: QuerySet[FamilyTreeRecord]) -> None:
        locked_ids = list(trees.order_by("id").values_list("id", flat=True))
        self._records().filter(id__in=locked_ids).delete()
