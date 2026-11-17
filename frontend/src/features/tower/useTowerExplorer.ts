import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { PersonSummary } from '../../api/types';
import { towerPath } from '../../routePaths';
import { highlightedIds, labelledIds } from './labelPolicy';
import type { TowerGraph } from './layout/towerGraph';
import { type Relation, type RelationStep, peopleOnPath, relationPath } from './relationPath';
import type { SceneFocus } from './scene/sceneTypes';

export interface RelationLink {
  readonly relation: Relation;
  readonly person: PersonSummary;
}

export interface RelationView {
  readonly target: PersonSummary;
  readonly links: readonly RelationLink[] | null;
}

export interface TowerExplorer {
  readonly focus: SceneFocus;
  readonly canGoBack: boolean;
  readonly relation: RelationView | null;
  readonly isAllNames: boolean;
  readonly select: (personId: number) => void;
  readonly goBack: () => void;
  readonly toggleAllNames: () => void;
  readonly showRelationTo: (personId: number) => void;
  readonly clearRelation: () => void;
}

interface SelectionHistory {
  readonly canGoBack: boolean;
  readonly select: (personId: number) => void;
  readonly goBack: () => void;
}

interface RelationState {
  readonly relation: RelationView | null;
  readonly pathIds: readonly number[];
  readonly showRelationTo: (personId: number) => void;
  readonly clearRelation: () => void;
}

const NO_PATH: readonly number[] = [];

export function useTowerExplorer(graph: TowerGraph, personId: number): TowerExplorer {
  const history = useSelectionHistory(personId);
  const relationState = useRelationState(graph, personId);
  const [isAllNames, setAllNames] = useState(true);
  const toggleAllNames = useCallback(() => {
    setAllNames((isShown) => !isShown);
  }, []);
  const focus = useMemo(() => {
    const request = { graph, focusId: personId, pathIds: relationState.pathIds };
    return { focusId: personId, highlightedIds: highlightedIds(request), labelledIds: labelledIds({ ...request, isAllNames }), pathIds: relationState.pathIds };
  }, [graph, personId, relationState.pathIds, isAllNames]);
  return { focus, isAllNames, toggleAllNames, ...history, relation: relationState.relation, showRelationTo: relationState.showRelationTo, clearRelation: relationState.clearRelation };
}

function useSelectionHistory(personId: number): SelectionHistory {
  const navigate = useNavigate();
  const [visited, setVisited] = useState<readonly number[]>([]);
  const select = useCallback(
    (nextId: number) => {
      if (nextId !== personId) {
        setVisited((earlier) => [...earlier, personId]);
        void navigate(towerPath(nextId), { replace: true });
      }
    },
    [navigate, personId],
  );
  const goBack = useCallback(() => {
    const previousId = visited.at(-1);
    if (previousId !== undefined) {
      setVisited(visited.slice(0, -1));
      void navigate(towerPath(previousId), { replace: true });
    }
  }, [navigate, visited]);
  return { canGoBack: visited.length > 0, select, goBack };
}

function useRelationState(graph: TowerGraph, personId: number): RelationState {
  const [targetId, setTargetId] = useState<number | null>(null);
  const steps = useMemo(() => (targetId === null || !graph.people.has(targetId) ? null : relationPath(graph, { fromId: personId, toId: targetId })), [graph, personId, targetId]);
  const relation = useMemo(() => {
    const target = targetId === null ? undefined : graph.people.get(targetId);
    return target === undefined ? null : { target, links: steps === null ? null : linksOf(graph, steps) };
  }, [graph, steps, targetId]);
  const pathIds = useMemo(() => (steps === null ? NO_PATH : peopleOnPath(steps)), [steps]);
  const clearRelation = useCallback(() => {
    setTargetId(null);
  }, []);
  return { relation, pathIds, showRelationTo: setTargetId, clearRelation };
}

function linksOf(graph: TowerGraph, steps: readonly RelationStep[]): RelationLink[] {
  return steps.flatMap((step) => {
    const person = graph.people.get(step.toId);
    return person === undefined ? [] : [{ relation: step.relation, person }];
  });
}
