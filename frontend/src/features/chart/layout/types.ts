import type { PersonSummary } from '../../../api/types';
import type { Point } from './geometry';

export interface ChartNode {
  readonly key: string;
  readonly person: PersonSummary;
  readonly x: number;
  readonly y: number;
  readonly generation: number;
  readonly isFocus: boolean;
  readonly isRepeat: boolean;
}

export type ChartEdgeKind = 'parentage' | 'partnership';

export interface ChartEdge {
  readonly key: string;
  readonly kind: ChartEdgeKind;
  readonly points: readonly Point[];
  readonly isDashed: boolean;
}

export interface ChartBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface HourglassLayout {
  readonly nodes: readonly ChartNode[];
  readonly edges: readonly ChartEdge[];
  readonly bounds: ChartBounds;
}
