import type { ParentLink, Partnership, PersonSummary, TreeGraph } from '../../../api/types';
import type { TowerEdge, TowerMarriage } from './towerTypes';

export interface TowerGraph {
  readonly people: ReadonlyMap<number, PersonSummary>;
  readonly ids: readonly number[];
  readonly edges: readonly TowerEdge[];
  readonly marriages: readonly TowerMarriage[];
  readonly parentsById: ReadonlyMap<number, readonly number[]>;
  readonly childrenById: ReadonlyMap<number, readonly number[]>;
  readonly spousesById: ReadonlyMap<number, readonly number[]>;
}

type IdPair = readonly [key: number, value: number];

const NO_ONE: readonly number[] = [];

const UNKNOWN_YEAR = Number.POSITIVE_INFINITY;

export function indexTreeGraph(graph: TreeGraph): TowerGraph {
  const people = new Map(graph.people.map((person) => [person.id, person]));
  const edges = graph.parent_links.filter((link) => joinsTwoPeople(people, [link.parent_id, link.child_id])).map(edgeOf);
  const marriages = graph.partnerships.filter((partnership) => joinsTwoPeople(people, [partnership.first_partner_id, partnership.second_partner_id])).map(marriageOf);
  const childrenPairs: IdPair[] = edges.map((edge) => [edge.parentId, edge.childId]);
  return {
    people,
    ids: [...people.keys()],
    edges,
    marriages,
    parentsById: groupedIds(edges.map((edge) => [edge.childId, edge.parentId])),
    childrenById: sortedByBirth(people, groupedIds(childrenPairs)),
    spousesById: groupedIds(marriages.flatMap((marriage): IdPair[] => [[marriage.firstId, marriage.secondId], [marriage.secondId, marriage.firstId]])),
  };
}

export function parentsOf(graph: TowerGraph, personId: number): readonly number[] {
  return graph.parentsById.get(personId) ?? NO_ONE;
}

export function childrenOf(graph: TowerGraph, personId: number): readonly number[] {
  return graph.childrenById.get(personId) ?? NO_ONE;
}

export function spousesOf(graph: TowerGraph, personId: number): readonly number[] {
  return graph.spousesById.get(personId) ?? NO_ONE;
}

export function personIn(graph: TowerGraph, personId: number): PersonSummary {
  const person = graph.people.get(personId);
  if (person === undefined) {
    throw new Error(`Person ${String(personId)} is not in this tree.`);
  }
  return person;
}

export function knownBirthYear(person: PersonSummary): number | null {
  return person.birth_date?.value.year ?? null;
}

function joinsTwoPeople(people: ReadonlyMap<number, PersonSummary>, [first, second]: IdPair): boolean {
  return first !== second && people.has(first) && people.has(second);
}

function edgeOf(link: ParentLink): TowerEdge {
  return { parentId: link.parent_id, childId: link.child_id, kind: link.kind };
}

function marriageOf(partnership: Partnership): TowerMarriage {
  return { firstId: partnership.first_partner_id, secondId: partnership.second_partner_id };
}

function groupedIds(pairs: readonly IdPair[]): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  for (const [key, value] of pairs) {
    const group = groups.get(key) ?? [];
    if (!group.includes(value)) {
      groups.set(key, [...group, value]);
    }
  }
  return groups;
}

function sortedByBirth(people: ReadonlyMap<number, PersonSummary>, groups: Map<number, number[]>): Map<number, number[]> {
  const birthKey = (personId: number): number => {
    const person = people.get(personId);
    return person === undefined ? UNKNOWN_YEAR : (knownBirthYear(person) ?? UNKNOWN_YEAR);
  };
  const byBirthThenId = (first: number, second: number): number => birthKey(first) - birthKey(second) || first - second;
  return new Map([...groups].map(([key, ids]) => [key, [...ids].sort(byBirthThenId)]));
}
