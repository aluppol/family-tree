from family_tree.domain.members import InactivityPeriod, MemberActivity
from family_tree.domain.ports import MemberActivityRepository, UnitOfWork
from family_tree.domain.workspaces import Principal, workspace_owner_of


class MemberService:
    def __init__(self, *, unit_of_work: UnitOfWork, activity: MemberActivityRepository) -> None:
        self._unit_of_work = unit_of_work
        self._activity = activity

    def record_activity(self, principal: Principal) -> None:
        if not principal.is_member():
            return
        with self._unit_of_work:
            self._record(principal)
            self._unit_of_work.commit()

    def count_members(self) -> int:
        return self._activity.count_members()

    def inactive_members(self, period: InactivityPeriod) -> list[MemberActivity]:
        return self._activity.inactive_members(period)

    def remove_inactive_members(self, period: InactivityPeriod) -> None:
        with self._unit_of_work:
            self._activity.delete_inactive_members(period)
            self._unit_of_work.commit()

    def _record(self, principal: Principal) -> None:
        owner = workspace_owner_of(principal)
        if principal.is_administrator():
            self._activity.record_administrator_activity(owner)
        else:
            self._activity.record_activity(owner)
