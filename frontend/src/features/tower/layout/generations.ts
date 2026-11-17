import { type TowerGraph, childrenOf, parentsOf, spousesOf } from './towerGraph';

type Levels = Map<number, number>;

type Raise = readonly [personId: number, level: number];

export function assignGenerations(graph: TowerGraph): ReadonlyMap<number, number> {
  const levels: Levels = new Map(graph.ids.map((personId) => [personId, 0]));
  const roundLimit = 2 * graph.ids.length + 2;
  for (let round = 0; round < roundLimit; round += 1) {
    const raises = pendingRaises(graph, levels);
    if (raises.length === 0) {
      break;
    }
    applyRaises(levels, raises);
  }
  return startingAtZero(levels);
}

function pendingRaises(graph: TowerGraph, levels: ReadonlyMap<number, number>): Raise[] {
  const childRaises = graph.edges
    .map((edge): Raise => [edge.childId, levelOf(levels, edge.parentId) + 1])
    .filter(([personId, level]) => level > levelOf(levels, personId));
  const founderRaises = graph.ids
    .filter((personId) => parentsOf(graph, personId).length === 0)
    .map((personId): Raise => [personId, founderLevel(graph, levels, personId)])
    .filter(([personId, level]) => level > levelOf(levels, personId));
  return [...childRaises, ...founderRaises];
}

function founderLevel(graph: TowerGraph, levels: ReadonlyMap<number, number>, personId: number): number {
  const childLevels = childrenOf(graph, personId).map((childId) => levelOf(levels, childId) - 1);
  const spouseLevels = spousesOf(graph, personId).map((spouseId) => levelOf(levels, spouseId));
  const belowChildren = childLevels.length === 0 ? [] : [Math.min(...childLevels)];
  return Math.max(levelOf(levels, personId), ...belowChildren, ...spouseLevels);
}

function applyRaises(levels: Levels, raises: readonly Raise[]): void {
  for (const [personId, level] of raises) {
    levels.set(personId, Math.max(level, levelOf(levels, personId)));
  }
}

function levelOf(levels: ReadonlyMap<number, number>, personId: number): number {
  return levels.get(personId) ?? 0;
}

function startingAtZero(levels: ReadonlyMap<number, number>): ReadonlyMap<number, number> {
  const lowest = Math.min(...levels.values());
  return new Map([...levels].map(([personId, level]) => [personId, level - lowest]));
}
