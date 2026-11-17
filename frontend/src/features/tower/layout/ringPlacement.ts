import { type FamilyForest, branchesOf, companionsOf, weightOf } from './familyForest';

export interface RingSpot {
  readonly angle: number;
  readonly radius: number;
}

export const SPHERE_GAP = 0.95;

const TAU = Math.PI * 2;
const FIRST_RING_RADIUS = 1.6;
const RING_STEP = 1.45;
const RING_FILL = 0.9;
const RING_GROWTH = 0.4;
const RADIUS_JITTER = 0.06;
const COMPANION_NUDGE = 0.001;

interface Sector {
  readonly ids: readonly number[];
  readonly start: number;
  readonly span: number;
}

interface Share {
  readonly personId: number;
  readonly start: number;
  readonly span: number;
}

interface RingInput {
  readonly generation: number;
  readonly count: number;
  readonly innerRadius: number;
}

export function targetAngles(forest: FamilyForest): ReadonlyMap<number, number> {
  const angles = new Map<number, number>();
  const pending: Sector[] = [{ ids: forest.roots, start: 0, span: TAU }];
  for (let sector = pending.pop(); sector !== undefined; sector = pending.pop()) {
    for (const share of sharesOf(forest, sector)) {
      angles.set(share.personId, share.start + share.span / 2);
      pending.push({ ids: branchesOf(forest, share.personId), start: share.start, span: share.span });
    }
  }
  return new Map([...angles, ...companionAngles(forest, angles)]);
}

export function placeOnRings(targets: ReadonlyMap<number, number>, generations: ReadonlyMap<number, number>): ReadonlyMap<number, RingSpot> {
  const rings = idsByGeneration(targets, generations);
  const spots = new Map<number, RingSpot>();
  let innerRadius = 0;
  for (const [generation, ids] of rings) {
    const radius = ringRadius({ generation, count: ids.length, innerRadius });
    for (const [personId, angle] of spreadOnRing(ids, targets, radius)) {
      spots.set(personId, { angle, radius: radius * jitterOf(personId) });
    }
    innerRadius = radius;
  }
  return spots;
}

export function seededUnit(seed: number): number {
  let value = (seed + 0x6d2b79f5) | 0;
  value = Math.imul(value ^ (value >>> 15), 1 | value);
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function sharesOf(forest: FamilyForest, { ids, start, span }: Sector): Share[] {
  const total = ids.reduce((sum, personId) => sum + weightOf(forest, personId), 0);
  let cursor = start;
  return ids.map((personId) => {
    const share = { personId, start: cursor, span: (span * weightOf(forest, personId)) / total };
    cursor += share.span;
    return share;
  });
}

function companionAngles(forest: FamilyForest, angles: ReadonlyMap<number, number>): [number, number][] {
  return [...angles].flatMap(([personId, angle]) => companionsOf(forest, personId).map((companionId, position): [number, number] => [companionId, angle + COMPANION_NUDGE * (position + 1)]));
}

function idsByGeneration(targets: ReadonlyMap<number, number>, generations: ReadonlyMap<number, number>): Map<number, number[]> {
  const rings = new Map<number, number[]>();
  for (const personId of [...targets.keys()].sort((first, second) => (generations.get(first) ?? 0) - (generations.get(second) ?? 0))) {
    const generation = generations.get(personId) ?? 0;
    rings.set(generation, [...(rings.get(generation) ?? []), personId]);
  }
  return rings;
}

function ringRadius({ generation, count, innerRadius }: RingInput): number {
  if (generation === 0 && count === 1) {
    return 0;
  }
  const planned = generation === 0 ? SPHERE_GAP : FIRST_RING_RADIUS + (generation - 1) * RING_STEP;
  const roomForEveryone = (count * SPHERE_GAP) / (TAU * RING_FILL);
  return Math.max(planned, roomForEveryone, innerRadius + RING_GROWTH);
}

function spreadOnRing(ids: readonly number[], targets: ReadonlyMap<number, number>, radius: number): [number, number][] {
  const sorted = ids.map((personId) => [personId, aroundCircle(targets.get(personId) ?? 0)] as const).sort((first, second) => first[1] - second[1] || first[0] - second[0]);
  if (radius === 0) {
    return sorted.map(([personId]) => [personId, 0]);
  }
  const spread = sweptAngles(sorted.map(([, angle]) => angle), SPHERE_GAP / radius);
  return sorted.map(([personId], position) => [personId, spread[position] ?? 0]);
}

function sweptAngles(targets: readonly number[], gap: number): number[] {
  const swept: number[] = [];
  for (const target of targets) {
    swept.push(Math.max(target, (swept.at(-1) ?? Number.NEGATIVE_INFINITY) + gap));
  }
  const first = swept[0] ?? 0;
  if ((swept.at(-1) ?? first) - first > TAU - gap) {
    return targets.map((_, position) => first + (position * TAU) / targets.length);
  }
  const shift = (sumOf(targets) - sumOf(swept)) / Math.max(1, targets.length);
  return swept.map((angle) => angle + shift);
}

function sumOf(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function aroundCircle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

function jitterOf(personId: number): number {
  return 1 + RADIUS_JITTER * (seededUnit(personId) * 2 - 1);
}
