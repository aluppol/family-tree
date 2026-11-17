import type { Sex } from '../../api/types';
import { type TowerGraph, childrenOf, parentsOf, spousesOf } from './layout/towerGraph';

export type Relation = 'parent' | 'child' | 'spouse';

export interface RelationStep {
  readonly fromId: number;
  readonly toId: number;
  readonly relation: Relation;
}

export interface RelationRequest {
  readonly fromId: number;
  readonly toId: number;
}

const RELATION_WORDS: Record<Relation, Record<Sex, string>> = {
  parent: { male: 'Father', female: 'Mother', other: 'Parent', unknown: 'Parent' },
  child: { male: 'Son', female: 'Daughter', other: 'Child', unknown: 'Child' },
  spouse: { male: 'Husband', female: 'Wife', other: 'Spouse', unknown: 'Spouse' },
};

export function relationPath(graph: TowerGraph, { fromId, toId }: RelationRequest): RelationStep[] | null {
  const arrivals = new Map<number, RelationStep | null>([[fromId, null]]);
  const queue = [fromId];
  for (const personId of queue) {
    if (personId === toId) {
      break;
    }
    for (const step of stepsFrom(graph, personId).filter((candidate) => !arrivals.has(candidate.toId))) {
      arrivals.set(step.toId, step);
      queue.push(step.toId);
    }
  }
  return arrivals.has(toId) ? stepsBackTo(arrivals, toId) : null;
}

export function relationWord(relation: Relation, sex: Sex): string {
  return RELATION_WORDS[relation][sex];
}

export function peopleOnPath(steps: readonly RelationStep[]): number[] {
  return [...new Set(steps.flatMap((step) => [step.fromId, step.toId]))];
}

function stepsFrom(graph: TowerGraph, personId: number): RelationStep[] {
  const stepsTo = (relation: Relation) => (toId: number): RelationStep => ({ fromId: personId, toId, relation });
  return [...parentsOf(graph, personId).map(stepsTo('parent')), ...childrenOf(graph, personId).map(stepsTo('child')), ...spousesOf(graph, personId).map(stepsTo('spouse'))];
}

function stepsBackTo(arrivals: ReadonlyMap<number, RelationStep | null>, toId: number): RelationStep[] {
  const steps: RelationStep[] = [];
  for (let step = arrivals.get(toId) ?? null; step !== null; step = arrivals.get(step.fromId) ?? null) {
    steps.unshift(step);
  }
  return steps;
}
