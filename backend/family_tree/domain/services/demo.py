from family_tree.domain.ports import FamilyTreeRepository, UnitOfWork


class DemoSandboxService:
    def __init__(self, *, unit_of_work: UnitOfWork, trees: FamilyTreeRepository) -> None:
        self._unit_of_work = unit_of_work
        self._trees = trees

    def count_sandboxes(self) -> int:
        return self._trees.count_guest_workspaces()

    def reset(self) -> None:
        with self._unit_of_work:
            self._trees.delete_guest_workspaces()
            self._unit_of_work.commit()
