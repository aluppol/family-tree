import type { ParentLinkKind, PersonSummary } from '../../../api/types';

export interface TowerPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type TowerAxis = 'years' | 'generations';

export type NodeTone =
  | { readonly kind: 'line'; readonly lineIndex: number }
  | { readonly kind: 'trunk' }
  | { readonly kind: 'married-in' }
  | { readonly kind: 'other' };

export interface TowerNode {
  readonly person: PersonSummary;
  readonly position: TowerPoint;
  readonly generation: number;
  readonly tone: NodeTone;
  readonly isEstimated: boolean;
  readonly isRepeat: boolean;
}

export interface TowerEdge {
  readonly parentId: number;
  readonly childId: number;
  readonly kind: ParentLinkKind;
}

export interface TowerMarriage {
  readonly firstId: number;
  readonly secondId: number;
}

export type RingLabel = { readonly kind: 'decade'; readonly year: number } | { readonly kind: 'generation'; readonly number: number };

export interface TowerRing {
  readonly y: number;
  readonly radius: number;
  readonly label: RingLabel | null;
  readonly isMajor: boolean;
}

export interface FamilyLine {
  readonly lineIndex: number;
  readonly head: PersonSummary;
}

export interface TowerLegend {
  readonly lines: readonly FamilyLine[];
  readonly hasTrunk: boolean;
  readonly hasMarriedIn: boolean;
  readonly hasOtherLines: boolean;
  readonly hasEstimatedYears: boolean;
  readonly hasRepeats: boolean;
}

export interface TowerLayout {
  readonly axis: TowerAxis;
  readonly nodes: ReadonlyMap<number, TowerNode>;
  readonly edges: readonly TowerEdge[];
  readonly marriages: readonly TowerMarriage[];
  readonly rings: readonly TowerRing[];
  readonly legend: TowerLegend;
}
