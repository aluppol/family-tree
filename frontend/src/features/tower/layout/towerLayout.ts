import { type PlacedYear, placeBirthYears, towerAxisOf } from './birthYears';
import { type FamilyForest, growForest } from './familyForest';
import { LINE_PALETTE_SIZE, type LineAssignment, assignLines, toneOf } from './familyLines';
import { assignGenerations } from './generations';
import { peopleWithRelatedParents } from './relatedParents';
import { type RingSpot, placeOnRings, targetAngles } from './ringPlacement';
import { type TowerGraph, personIn } from './towerGraph';
import type { TowerAxis, TowerLayout, TowerLegend, TowerNode, TowerRing } from './towerTypes';

export const GENERATION_HEIGHT = 2.2;
export const YEAR_HEIGHT = 0.1;

const RING_MARGIN = 0.9;
const DECADE = 10;
const LABELLED_YEARS = 50;
const NO_SPOT: RingSpot = { angle: 0, radius: 0 };

interface Placement {
  readonly graph: TowerGraph;
  readonly axis: TowerAxis;
  readonly generations: ReadonlyMap<number, number>;
  readonly years: ReadonlyMap<number, PlacedYear>;
  readonly firstDecade: number;
  readonly forest: FamilyForest;
  readonly lines: LineAssignment;
  readonly spots: ReadonlyMap<number, RingSpot>;
  readonly repeats: ReadonlySet<number>;
}

export function layoutTower(graph: TowerGraph): TowerLayout {
  const generations = assignGenerations(graph);
  const forest = growForest(graph, generations);
  const years = placeBirthYears(graph, generations);
  const placement: Placement = {
    graph,
    axis: towerAxisOf(graph),
    generations,
    years,
    firstDecade: decadeOf(Math.min(...yearsIn(years))),
    forest,
    lines: assignLines(forest),
    spots: placeOnRings(targetAngles(forest), generations),
    repeats: peopleWithRelatedParents(graph, generations),
  };
  const nodes = new Map(graph.ids.map((personId) => [personId, nodeOf(placement, personId)]));
  return { axis: placement.axis, nodes, edges: graph.edges, marriages: graph.marriages, rings: ringsOf(placement), legend: legendOf(placement, [...nodes.values()]) };
}

function nodeOf(placement: Placement, personId: number): TowerNode {
  const spot = placement.spots.get(personId) ?? NO_SPOT;
  return {
    person: personIn(placement.graph, personId),
    position: { x: spot.radius * Math.cos(spot.angle), y: heightOf(placement, personId), z: spot.radius * Math.sin(spot.angle) },
    generation: placement.generations.get(personId) ?? 0,
    tone: toneOf(placement.forest, placement.lines, personId),
    isEstimated: placement.axis === 'years' && (placement.years.get(personId)?.isEstimated ?? false),
    isRepeat: placement.repeats.has(personId),
  };
}

function heightOf(placement: Placement, personId: number): number {
  if (placement.axis === 'generations') {
    return (placement.generations.get(personId) ?? 0) * GENERATION_HEIGHT;
  }
  return ((placement.years.get(personId)?.year ?? placement.firstDecade) - placement.firstDecade) * YEAR_HEIGHT;
}

function yearsIn(years: ReadonlyMap<number, PlacedYear>): number[] {
  return [...years.values()].map((placed) => placed.year);
}

function decadeOf(year: number): number {
  return Number.isFinite(year) ? Math.floor(year / DECADE) * DECADE : 0;
}

function ringsOf(placement: Placement): TowerRing[] {
  return placement.axis === 'years' ? decadeRings(placement) : generationRings(placement);
}

function decadeRings(placement: Placement): TowerRing[] {
  const start = placement.firstDecade;
  const end = Math.ceil(Math.max(start, ...yearsIn(placement.years)) / DECADE) * DECADE;
  const radius = Math.max(0, ...[...placement.spots.values()].map((spot) => spot.radius)) + RING_MARGIN;
  const decades = Array.from({ length: (end - start) / DECADE + 1 }, (_, position) => start + position * DECADE);
  return decades.map((decade) => ({
    y: (decade - start) * YEAR_HEIGHT,
    radius,
    label: decade % LABELLED_YEARS === 0 ? String(decade) : null,
    isMajor: decade % LABELLED_YEARS === 0,
  }));
}

function generationRings(placement: Placement): TowerRing[] {
  const deepest = Math.max(0, ...placement.generations.values());
  return Array.from({ length: deepest + 1 }, (_, generation) => ({
    y: generation * GENERATION_HEIGHT,
    radius: widestSpotIn(placement, generation) + RING_MARGIN,
    label: `Generation ${String(generation + 1)}`,
    isMajor: true,
  }));
}

function widestSpotIn(placement: Placement, generation: number): number {
  const radii = [...placement.spots].filter(([personId]) => placement.generations.get(personId) === generation).map(([, spot]) => spot.radius);
  return Math.max(0, ...radii);
}

function legendOf(placement: Placement, nodes: readonly TowerNode[]): TowerLegend {
  return {
    lines: placement.lines.heads.slice(0, LINE_PALETTE_SIZE).map((headId, lineIndex) => ({ lineIndex, head: personIn(placement.graph, headId) })),
    hasTrunk: placement.lines.trunk.size > 0,
    hasMarriedIn: placement.forest.besideById.size > 0,
    hasOtherLines: nodes.some((node) => node.tone.kind === 'other'),
    hasEstimatedYears: nodes.some((node) => node.isEstimated),
    hasRepeats: placement.repeats.size > 0,
  };
}
