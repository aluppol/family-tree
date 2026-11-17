import { type TowerGraph, childrenOf, parentsOf, spousesOf } from './layout/towerGraph';

export const RELATIVE_LABEL_LIMIT = 40;
export const ALL_NAMES_LIMIT = 200;

export interface FocusRequest {
  readonly graph: TowerGraph;
  readonly focusId: number;
  readonly pathIds: readonly number[];
}

export interface LabelRequest extends FocusRequest {
  readonly isAllNames: boolean;
}

export function closeFamilyIds(graph: TowerGraph, focusId: number): number[] {
  return unique([focusId, ...parentsOf(graph, focusId), ...spousesOf(graph, focusId), ...childrenOf(graph, focusId)]);
}

export function highlightedIds({ graph, focusId, pathIds }: FocusRequest): ReadonlySet<number> {
  return new Set([...closeFamilyIds(graph, focusId), ...pathIds]);
}

export function labelledIds(request: LabelRequest): ReadonlySet<number> {
  const { graph, focusId, pathIds, isAllNames } = request;
  if (isAllNames) {
    return new Set([...pathIds, ...nearestIds(graph, focusId).slice(0, ALL_NAMES_LIMIT)]);
  }
  const [, ...relatives] = closeFamilyIds(graph, focusId);
  return new Set(unique([focusId, ...pathIds, ...relatives]).slice(0, RELATIVE_LABEL_LIMIT));
}

function nearestIds(graph: TowerGraph, focusId: number): number[] {
  const reached = [focusId];
  const seen = new Set(reached);
  for (const personId of reached) {
    for (const relativeId of closeFamilyIds(graph, personId).filter((candidate) => !seen.has(candidate))) {
      seen.add(relativeId);
      reached.push(relativeId);
    }
  }
  return unique([...reached, ...graph.ids]);
}

function unique(ids: readonly number[]): number[] {
  return [...new Set(ids)];
}
