import type { TreeGraph } from '../../../api/types';
import { type FamilyScript, familyChart } from '../../chart/testing/familyScript';
import { type TowerGraph, indexTreeGraph } from '../layout/towerGraph';

export type TowerScript = Omit<FamilyScript, 'focus'>;

export function treeGraphOf(script: TowerScript): TreeGraph {
  const [firstPerson] = script.people;
  const chart = familyChart({ ...script, focus: firstPerson?.[0] ?? '' });
  return { people: chart.people, parent_links: chart.parent_links, partnerships: chart.partnerships };
}

export function towerGraphOf(script: TowerScript): TowerGraph {
  return indexTreeGraph(treeGraphOf(script));
}

export function personIdOf(graph: TowerGraph, name: string): number {
  const person = [...graph.people.values()].find((candidate) => candidate.given_names === name);
  if (person === undefined) {
    throw new Error(`${name} is not in the test family.`);
  }
  return person.id;
}

export function namesOf(graph: TowerGraph, ids: Iterable<number>): string[] {
  return [...ids].map((personId) => graph.people.get(personId)?.given_names ?? `#${String(personId)}`);
}
