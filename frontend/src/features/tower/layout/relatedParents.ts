import { type TowerGraph, parentsOf } from './towerGraph';

const ANCESTRY_PEOPLE_LIMIT = 4000;

export function peopleWithRelatedParents(graph: TowerGraph, generations: ReadonlyMap<number, number>): ReadonlySet<number> {
  if (graph.ids.length > ANCESTRY_PEOPLE_LIMIT) {
    return new Set();
  }
  const lineages = lineagesOf(graph, generations);
  return new Set(graph.ids.filter((personId) => haveCommonLineage(parentsOf(graph, personId).map((parentId) => lineages.get(parentId) ?? new Set([parentId])))));
}

function lineagesOf(graph: TowerGraph, generations: ReadonlyMap<number, number>): ReadonlyMap<number, ReadonlySet<number>> {
  const lineages = new Map<number, ReadonlySet<number>>();
  const generationOf = (personId: number): number => generations.get(personId) ?? 0;
  for (const personId of [...graph.ids].sort((first, second) => generationOf(first) - generationOf(second))) {
    const parentLineages = parentsOf(graph, personId).map((parentId) => lineages.get(parentId) ?? new Set([parentId]));
    lineages.set(personId, new Set([personId, ...parentLineages.flatMap((lineage) => [...lineage])]));
  }
  return lineages;
}

function haveCommonLineage(lineages: readonly ReadonlySet<number>[]): boolean {
  return lineages.some((lineage, position) => lineages.slice(position + 1).some((other) => [...lineage].some((ancestorId) => other.has(ancestorId))));
}
