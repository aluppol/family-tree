from family_tree.domain.ports import KinshipGraph, PersonRepository
from family_tree.domain.read_models import ChartScope, FamilyChart
from family_tree.domain.services.workspaces import WorkspaceService
from family_tree.domain.workspaces import Principal


class ChartService:
    def __init__(
        self, *, workspaces: WorkspaceService, people: PersonRepository, graph: KinshipGraph
    ) -> None:
        self._workspaces = workspaces
        self._people = people
        self._graph = graph

    def chart(self, principal: Principal, scope: ChartScope) -> FamilyChart:
        tree_id = self._workspaces.tree_of(principal).id
        self._people.get(tree_id, scope.focus_id)
        return self._graph.chart(tree_id, scope)
