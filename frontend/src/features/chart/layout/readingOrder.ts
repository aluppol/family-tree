import { rowCentreY } from './geometry';
import { sortedBy } from './ordering';
import type { PlacedOccurrence } from './placedHalf';
import type { ChartNode } from './types';

export function toChartNodes(occurrences: readonly PlacedOccurrence[], focusKey: string): ChartNode[] {
  const repeatKeys = findRepeatKeys(occurrences, focusKey);
  const nodes = occurrences.map((occurrence) => ({
    key: occurrence.key,
    person: occurrence.person,
    x: occurrence.x,
    y: rowCentreY(occurrence.generation),
    generation: occurrence.generation,
    isFocus: occurrence.key === focusKey,
    isRepeat: repeatKeys.has(occurrence.key),
  }));
  return sortedBy(nodes, (node) => [node.generation, node.x]);
}

function findRepeatKeys(occurrences: readonly PlacedOccurrence[], focusKey: string): Set<string> {
  const primacyOrder = sortedBy(occurrences, (occurrence) => [
    occurrence.key === focusKey ? 0 : 1,
    Math.abs(occurrence.generation),
    occurrence.generation,
    occurrence.x,
  ]);
  const seenPeople = new Set<number>();
  const repeatKeys = new Set<string>();
  for (const occurrence of primacyOrder) {
    if (seenPeople.has(occurrence.person.id)) {
      repeatKeys.add(occurrence.key);
    }
    seenPeople.add(occurrence.person.id);
  }
  return repeatKeys;
}
