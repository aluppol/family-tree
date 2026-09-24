import type { PersonSummary } from '../../../api/types';
import type { FamilyIndex } from './familyIndex';

export interface TraversalStep {
  readonly index: FamilyIndex;
  readonly person: PersonSummary;
  readonly key: string;
  readonly lineage: ReadonlySet<number>;
}

export function firstStep(index: FamilyIndex, focus: PersonSummary): TraversalStep {
  return { index, person: focus, key: focusKey(focus), lineage: new Set([focus.id]) };
}

export function focusKey(focus: PersonSummary): string {
  return String(focus.id);
}

export function stepToParent(step: TraversalStep, parent: PersonSummary): TraversalStep {
  return stepTo({ step, person: parent, marker: '^' });
}

export function stepToChild(step: TraversalStep, child: PersonSummary): TraversalStep {
  return stepTo({ step, person: child, marker: 'v' });
}

export function partnerKey(step: TraversalStep, partner: PersonSummary): string {
  return `${step.key}+${String(partner.id)}`;
}

function stepTo({ step, person, marker }: { step: TraversalStep; person: PersonSummary; marker: string }): TraversalStep {
  return {
    index: step.index,
    person,
    key: `${step.key}${marker}${String(person.id)}`,
    lineage: new Set([...step.lineage, person.id]),
  };
}
