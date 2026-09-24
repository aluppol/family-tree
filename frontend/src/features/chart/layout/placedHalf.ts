import type { PersonSummary } from '../../../api/types';
import type { ChartEdge } from './types';

export interface PlacedOccurrence {
  readonly key: string;
  readonly person: PersonSummary;
  readonly x: number;
  readonly generation: number;
}

export interface PlacedHalf {
  readonly occurrences: readonly PlacedOccurrence[];
  readonly edges: readonly ChartEdge[];
}

export function combineHalves(halves: readonly PlacedHalf[]): PlacedHalf {
  return {
    occurrences: halves.flatMap((half) => half.occurrences),
    edges: halves.flatMap((half) => half.edges),
  };
}
