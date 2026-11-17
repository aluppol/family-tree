import { type TowerGraph, childrenOf, knownBirthYear, parentsOf, personIn, spousesOf } from './towerGraph';
import type { TowerAxis } from './towerTypes';

export interface PlacedYear {
  readonly year: number;
  readonly isEstimated: boolean;
}

export const GENERATION_YEARS = 25;

const FALLBACK_FIRST_YEAR = 1900;

type Years = Map<number, PlacedYear>;

export function towerAxisOf(graph: TowerGraph): TowerAxis {
  const knownCount = graph.ids.filter((personId) => knownBirthYear(personIn(graph, personId)) !== null).length;
  return knownCount > 0 && knownCount * 2 >= graph.ids.length ? 'years' : 'generations';
}

export function placeBirthYears(graph: TowerGraph, generations: ReadonlyMap<number, number>): ReadonlyMap<number, PlacedYear> {
  const years = knownYears(graph);
  const roundLimit = graph.ids.length;
  for (let round = 0; round < roundLimit; round += 1) {
    const estimates = estimatesFromRelatives(graph, years);
    if (estimates.length === 0) {
      break;
    }
    for (const [personId, year] of estimates) {
      years.set(personId, { year, isEstimated: true });
    }
  }
  return withGenerationEstimates({ graph, generations, years });
}

function knownYears(graph: TowerGraph): Years {
  const years: Years = new Map();
  for (const personId of graph.ids) {
    const year = knownBirthYear(personIn(graph, personId));
    if (year !== null) {
      years.set(personId, { year, isEstimated: false });
    }
  }
  return years;
}

function estimatesFromRelatives(graph: TowerGraph, years: ReadonlyMap<number, PlacedYear>): (readonly [number, number])[] {
  return graph.ids
    .filter((personId) => !years.has(personId))
    .map((personId) => [personId, relativeHints(graph, years, personId)] as const)
    .filter(([, hints]) => hints.length > 0)
    .map(([personId, hints]) => [personId, Math.round(hints.reduce((sum, hint) => sum + hint, 0) / hints.length)] as const);
}

function relativeHints(graph: TowerGraph, years: ReadonlyMap<number, PlacedYear>, personId: number): number[] {
  const yearOf = (relativeId: number): number[] => {
    const placed = years.get(relativeId);
    return placed === undefined ? [] : [placed.year];
  };
  return [
    ...parentsOf(graph, personId).flatMap(yearOf).map((year) => year + GENERATION_YEARS),
    ...childrenOf(graph, personId).flatMap(yearOf).map((year) => year - GENERATION_YEARS),
    ...spousesOf(graph, personId).flatMap(yearOf),
  ];
}

interface GenerationEstimateInput {
  graph: TowerGraph;
  generations: ReadonlyMap<number, number>;
  years: ReadonlyMap<number, PlacedYear>;
}

function withGenerationEstimates({ graph, generations, years }: GenerationEstimateInput): ReadonlyMap<number, PlacedYear> {
  const generationOf = (personId: number): number => generations.get(personId) ?? 0;
  const offsets = [...years].map(([personId, placed]) => placed.year - generationOf(personId) * GENERATION_YEARS);
  const offset = offsets.length === 0 ? FALLBACK_FIRST_YEAR : Math.round(offsets.reduce((sum, value) => sum + value, 0) / offsets.length);
  const missing = graph.ids
    .filter((personId) => !years.has(personId))
    .map((personId): [number, PlacedYear] => [personId, { year: offset + generationOf(personId) * GENERATION_YEARS, isEstimated: true }]);
  return new Map([...years, ...missing]);
}
