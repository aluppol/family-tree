from datetime import timedelta

from django.db.models import Q, QuerySet, Value
from django.db.models.functions import Now, TruncDay

from family_tree.adapters.persistence.mappers import MemberActivityMapper
from family_tree.adapters.persistence.models import FamilyTreeRecord
from family_tree.adapters.persistence.trees import delete_locked_trees
from family_tree.domain.enums import OwnerKind
from family_tree.domain.members import InactivityPeriod, MemberActivity
from family_tree.domain.workspaces import WorkspaceOwner


class DjangoMemberActivityRepository:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def record_activity(self, owner: WorkspaceOwner) -> None:
        self._tree_of(owner).filter(_not_active_today()).update(last_active_at=Now())

    def record_administrator_activity(self, owner: WorkspaceOwner) -> None:
        unrecorded = _not_active_today() | Q(was_seen_as_administrator=False)
        self._tree_of(owner).filter(unrecorded).update(last_active_at=Now(), was_seen_as_administrator=True)

    def count_members(self) -> int:
        return self._members().count()

    def inactive_members(self, period: InactivityPeriod) -> list[MemberActivity]:
        rows = self._inactive(period).order_by("last_active_at", "id").values("owner_key", "last_active_at")
        return [MemberActivityMapper.from_row(row) for row in rows]

    def delete_inactive_members(self, period: InactivityPeriod) -> None:
        delete_locked_trees(self._inactive(period).select_for_update())

    def _tree_of(self, owner: WorkspaceOwner) -> QuerySet[FamilyTreeRecord]:
        return self._records().filter(owner_kind=owner.kind.value, owner_key=owner.key)

    def _members(self) -> QuerySet[FamilyTreeRecord]:
        return self._records().filter(owner_kind=OwnerKind.MEMBER.value)

    def _inactive(self, period: InactivityPeriod) -> QuerySet[FamilyTreeRecord]:
        cutoff = Now() - Value(timedelta(days=period.days))
        return self._members().filter(was_seen_as_administrator=False, last_active_at__lte=cutoff)

    def _records(self) -> QuerySet[FamilyTreeRecord]:
        return FamilyTreeRecord.objects.using(self._database)


def _not_active_today() -> Q:
    return Q(last_active_at__isnull=True) | Q(last_active_at__lt=TruncDay(Now()))
