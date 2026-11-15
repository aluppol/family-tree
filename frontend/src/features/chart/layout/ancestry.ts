import type { PersonSummary } from '../../../api/types';
import { type FamilyIndex, type Parentage, parentLinksOf } from './familyIndex';
import { distinctBy, kindRank, sexRank, type SortKey, sortedBy } from './ordering';
import { firstOccurrenceKeys, firstStep, stepToParent, type TraversalStep } from './traversal';

export interface AncestorTree {
  readonly key: string;
  readonly person: PersonSummary;
  readonly parentGroups: readonly ParentGroup[];
}

export interface ParentGroup {
  readonly parents: readonly AncestorTree[];
  readonly isDashed: boolean;
}

export function buildAncestry(index: FamilyIndex, focus: PersonSummary): AncestorTree {
  const start = firstStep(index, focus);
  return ancestorTree(start, firstOccurrenceKeys(start, parentSteps));
}

function ancestorTree(step: TraversalStep, expandedKeys: ReadonlySet<string>): AncestorTree {
  const parentages = expandedKeys.has(step.key) ? parentsToDraw(step) : [];
  return {
    key: step.key,
    person: step.person,
    parentGroups: groupsOfParents(parentages).map((group) => ({
      parents: group.map((parentage) => ancestorTree(stepToParent(step, parentage.parent), expandedKeys)),
      isDashed: group.some((parentage) => parentage.kind !== 'birth'),
    })),
  };
}

function parentSteps(step: TraversalStep): TraversalStep[] {
  return parentsToDraw(step).map((parentage) => stepToParent(step, parentage.parent));
}

function parentsToDraw(step: TraversalStep): Parentage[] {
  return parentsInOrder(step).filter((parentage) => !step.lineage.has(parentage.parent.id));
}

function parentsInOrder({ index, person }: TraversalStep): Parentage[] {
  return distinctBy(sortedBy(parentLinksOf(index, person), parentOrderKey), (parentage) => parentage.parent.id);
}

function parentOrderKey(parentage: Parentage): SortKey {
  return [kindRank(parentage.kind), sexRank(parentage.parent.sex), parentage.parent.id];
}

function groupsOfParents(parentages: readonly Parentage[]): Parentage[][] {
  const birthParents = parentages.filter((parentage) => parentage.kind === 'birth');
  const otherParents = parentages.filter((parentage) => parentage.kind !== 'birth');
  return [...inPairs(birthParents), ...inPairs(otherParents)];
}

function inPairs<Entry>(entries: readonly Entry[]): Entry[][] {
  return entries.flatMap((_, position) => (position % 2 === 0 ? [entries.slice(position, position + 2)] : []));
}
