import { type Contour, mergeContours, mirrorContour } from './contour';
import { FAMILY_GAP } from './geometry';

export interface RowMember {
  readonly contour: Contour;
}

export type Placed<Member> = Member & { readonly offset: number };

export interface RowGaps {
  readonly withinGroup: number;
  readonly betweenGroups: number;
}

interface SpacedSubtree {
  readonly contour: Contour;
  readonly gapBefore: number;
}

export function packGroupedRow<Member extends RowMember>(groups: readonly (readonly Member[])[], gaps: RowGaps): Placed<Member>[][] {
  const packedGroups = groups.map((members) => packGroup(members, gaps.withinGroup));
  const groupOffsets = balancedOffsets(
    packedGroups.map((placed, position) => ({ contour: mergeContours(placed), gapBefore: position === 0 ? 0 : gaps.betweenGroups })),
  );
  return packedGroups.map((placed, position) => shiftPlaced(placed, groupOffsets[position] ?? 0));
}

export function shiftPlaced<Member>(placed: readonly Placed<Member>[], shift: number): Placed<Member>[] {
  return placed.map((member) => ({ ...member, offset: member.offset + shift }));
}

export function spanCentre(placed: readonly Placed<RowMember>[]): number {
  const first = placed[0]?.offset ?? 0;
  const last = placed.at(-1)?.offset ?? first;
  return (first + last) / 2;
}

function packGroup<Member extends RowMember>(members: readonly Member[], gap: number): Placed<Member>[] {
  const offsets = balancedOffsets(members.map((member, position) => ({ contour: member.contour, gapBefore: position === 0 ? 0 : gap })));
  return members.map((member, position) => ({ ...member, offset: offsets[position] ?? 0 }));
}

function balancedOffsets(row: readonly SpacedSubtree[]): number[] {
  const fromLeft = packFromLeft(row);
  const fromRight = packFromRight(row);
  return fromLeft.map((offset, position) => (offset + (fromRight[position] ?? offset)) / 2);
}

function packFromLeft(row: readonly SpacedSubtree[]): number[] {
  const offsets: number[] = [];
  const reach: number[] = [];
  for (const subtree of row) {
    const offset = offsets.length === 0 ? 0 : clearance(reach, subtree);
    offsets.push(offset);
    extendReach({ reach, edges: subtree.contour.right, offset });
  }
  return offsets;
}

function packFromRight(row: readonly SpacedSubtree[]): number[] {
  const mirrored = row
    .map((subtree, position) => ({ contour: mirrorContour(subtree.contour), gapBefore: row[position + 1]?.gapBefore ?? 0 }))
    .reverse();
  const offsets = packFromLeft(mirrored)
    .reverse()
    .map((offset) => -offset);
  const first = offsets[0] ?? 0;
  return offsets.map((offset) => offset - first);
}

function clearance(reach: readonly number[], subtree: SpacedSubtree): number {
  return subtree.contour.left.reduce((offset, edge, level) => {
    const reached = reach[level];
    return reached === undefined ? offset : Math.max(offset, reached + gapAt(subtree, level) - edge);
  }, Number.NEGATIVE_INFINITY);
}

function gapAt(subtree: SpacedSubtree, level: number): number {
  return level === 0 ? subtree.gapBefore : FAMILY_GAP;
}

function extendReach({ reach, edges, offset }: { reach: number[]; edges: readonly number[]; offset: number }): void {
  edges.forEach((edge, level) => {
    reach[level] = Math.max(reach[level] ?? Number.NEGATIVE_INFINITY, edge + offset);
  });
}
