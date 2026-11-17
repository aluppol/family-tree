import { type TowerGraph, childrenOf, parentsOf, personIn, spousesOf } from './towerGraph';

export interface FamilyForest {
  readonly roots: readonly number[];
  readonly branchesById: ReadonlyMap<number, readonly number[]>;
  readonly besideById: ReadonlyMap<number, number>;
  readonly companionsById: ReadonlyMap<number, readonly number[]>;
  readonly weights: ReadonlyMap<number, number>;
}

const COMPANION_WEIGHT = 0.5;

const NO_ONE: readonly number[] = [];

export function growForest(graph: TowerGraph, generations: ReadonlyMap<number, number>): FamilyForest {
  const placementParents = new Map(graph.ids.flatMap((personId) => placementParentEntry(graph, personId)));
  const branchesById = branchesFrom(graph, placementParents);
  const besideById = companionPlacements(graph, branchesById);
  const companionsById = groupedByTarget(besideById);
  const members = graph.ids.filter((personId) => !besideById.has(personId));
  const weights = forestWeights({ members, generations, branchesById, companionsById });
  const byWeight = (first: number, second: number): number => (weights.get(second) ?? 0) - (weights.get(first) ?? 0) || first - second;
  const roots = members.filter((personId) => parentsOf(graph, personId).length === 0).sort(byWeight);
  return { roots, branchesById, besideById, companionsById, weights };
}

export function branchesOf(forest: FamilyForest, personId: number): readonly number[] {
  return forest.branchesById.get(personId) ?? NO_ONE;
}

export function companionsOf(forest: FamilyForest, personId: number): readonly number[] {
  return forest.companionsById.get(personId) ?? NO_ONE;
}

export function weightOf(forest: FamilyForest, personId: number): number {
  return forest.weights.get(personId) ?? 1;
}

function placementParentEntry(graph: TowerGraph, childId: number): [number, number][] {
  const rank = (parentId: number): [number, number, number] => [
    parentsOf(graph, parentId).length > 0 ? 0 : 1,
    personIn(graph, parentId).sex === 'male' ? 0 : 1,
    parentId,
  ];
  const byRank = (first: number, second: number): number => {
    const [firstRank, secondRank] = [rank(first), rank(second)];
    return firstRank[0] - secondRank[0] || firstRank[1] - secondRank[1] || firstRank[2] - secondRank[2];
  };
  const [placementParent] = [...parentsOf(graph, childId)].sort(byRank);
  return placementParent === undefined ? [] : [[childId, placementParent]];
}

function branchesFrom(graph: TowerGraph, placementParents: ReadonlyMap<number, number>): Map<number, readonly number[]> {
  const branches = graph.ids.map((parentId) => [parentId, childrenOf(graph, parentId).filter((childId) => placementParents.get(childId) === parentId)] as const);
  return new Map(branches.filter(([, children]) => children.length > 0));
}

function companionPlacements(graph: TowerGraph, branchesById: ReadonlyMap<number, readonly number[]>): Map<number, number> {
  const besideById = new Map<number, number>();
  const settled = new Set(graph.ids.filter((personId) => parentsOf(graph, personId).length > 0 || branchesById.has(personId)));
  for (const personId of graph.ids.filter((candidate) => !settled.has(candidate))) {
    const partner = partnersOf(graph, personId).find((candidate) => settled.has(candidate));
    if (partner === undefined) {
      settled.add(personId);
    } else {
      besideById.set(personId, partner);
    }
  }
  return besideById;
}

function partnersOf(graph: TowerGraph, personId: number): number[] {
  const coParents = childrenOf(graph, personId).flatMap((childId) => parentsOf(graph, childId));
  return [...new Set([...spousesOf(graph, personId), ...coParents])].filter((partnerId) => partnerId !== personId).sort((first, second) => first - second);
}

function groupedByTarget(besideById: ReadonlyMap<number, number>): Map<number, readonly number[]> {
  const groups = new Map<number, number[]>();
  for (const [companionId, targetId] of besideById) {
    groups.set(targetId, [...(groups.get(targetId) ?? []), companionId]);
  }
  return groups;
}

interface WeightInput {
  members: readonly number[];
  generations: ReadonlyMap<number, number>;
  branchesById: ReadonlyMap<number, readonly number[]>;
  companionsById: ReadonlyMap<number, readonly number[]>;
}

function forestWeights({ members, generations, branchesById, companionsById }: WeightInput): ReadonlyMap<number, number> {
  const weights = new Map<number, number>();
  const generationOf = (personId: number): number => generations.get(personId) ?? 0;
  for (const personId of [...members].sort((first, second) => generationOf(second) - generationOf(first))) {
    const branchWeight = (branchesById.get(personId) ?? []).reduce((sum, childId) => sum + (weights.get(childId) ?? 1), 0);
    weights.set(personId, Math.max(1, branchWeight) + COMPANION_WEIGHT * (companionsById.get(personId) ?? []).length);
  }
  return weights;
}
