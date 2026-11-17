import { expect, test } from 'vitest';
import { generatedFamily } from '../../chart/testing/generatedFamily';
import { type TowerScript, namesOf, personIdOf, towerGraphOf } from '../testing/towerScript';
import { SPHERE_GAP } from './ringPlacement';
import { indexTreeGraph } from './towerGraph';
import { GENERATION_HEIGHT, layoutTower } from './towerLayout';
import type { NodeTone, TowerAxis, TowerLayout, TowerNode } from './towerTypes';

interface LayoutExpectation {
  axis?: TowerAxis;
  generations?: Record<string, number>;
  tones?: Record<string, string>;
  lineHeads?: string[];
  estimated?: string[];
  repeats?: string[];
}

interface LayoutCase {
  id: string;
  script: TowerScript;
  expected: LayoutExpectation;
}

const NINE_CHILDREN = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'];

const CASES: LayoutCase[] = [
  {
    id: 'one founder: generations count from the oldest and each child of the split starts a line',
    script: {
      people: [['Jovan', 'male', null], ['Petar', 'male', null], ['Marko', 'male', null], ['Luka', 'male', null], ['Ana', 'female', null]],
      parents: [['Jovan', 'Petar'], ['Jovan', 'Marko'], ['Jovan', 'Luka'], ['Petar', 'Ana']],
    },
    expected: {
      axis: 'generations',
      generations: { Jovan: 0, Petar: 1, Ana: 2 },
      tones: { Jovan: 'trunk', Petar: 'line 0', Ana: 'line 0', Marko: 'line 1', Luka: 'line 2' },
      lineHeads: ['Petar', 'Marko', 'Luka'],
    },
  },
  {
    id: 'a spouse from outside the family stands in the generation of the spouse and is marked as married in',
    script: {
      people: [['Jovan', 'male', null], ['Milan', 'male', null], ['Mara', 'female', null], ['Lena', 'female', null]],
      parents: [['Jovan', 'Milan'], ['Milan', 'Lena']],
      partners: [['Milan', 'Mara']],
    },
    expected: { generations: { Jovan: 0, Milan: 1, Mara: 1, Lena: 2 }, tones: { Jovan: 'line 0', Milan: 'line 0', Lena: 'line 0', Mara: 'married-in' }, lineHeads: ['Jovan'] },
  },
  {
    id: 'a parent without parents of their own stands one generation above the child',
    script: {
      people: [['Dan', 'male', null], ['Carl', 'male', null], ['Ana', 'female', null], ['Bob', 'male', null]],
      parents: [['Dan', 'Carl'], ['Carl', 'Bob'], ['Ana', 'Bob']],
    },
    expected: { generations: { Dan: 0, Carl: 1, Ana: 1, Bob: 2 }, tones: { Ana: 'married-in', Bob: 'line 0' } },
  },
  {
    id: 'birth years make the height when most people have one, and missing years are estimated from relatives',
    script: {
      people: [['Anna', 'female', 1800], ['Boris', 'male', 1828], ['Clara', 'female', null]],
      parents: [['Anna', 'Boris'], ['Boris', 'Clara']],
    },
    expected: { axis: 'years', estimated: ['Clara'] },
  },
  {
    id: 'without birth years nobody is drawn as estimated',
    script: { people: [['Anna', 'female', null], ['Boris', 'male', 1828], ['Clara', 'female', null]], parents: [['Anna', 'Boris'], ['Boris', 'Clara']] },
    expected: { axis: 'generations', estimated: [] },
  },
  {
    id: 'two founders each start a line, the larger family first',
    script: {
      people: [['Xena', 'female', null], ['Xavier', 'male', null], ['Yuri', 'male', null], ['Yan', 'male', null], ['Yana', 'female', null]],
      parents: [['Xena', 'Xavier'], ['Yuri', 'Yan'], ['Yuri', 'Yana']],
    },
    expected: { tones: { Yuri: 'line 0', Yana: 'line 0', Xena: 'line 1', Xavier: 'line 1' }, lineHeads: ['Yuri', 'Xena'] },
  },
  {
    id: 'a child of cousins is marked because the parents are related',
    script: {
      people: [['Gran', 'female', null], ['Paul', 'male', null], ['Pia', 'female', null], ['Carl', 'male', null], ['Cora', 'female', null], ['Kid', 'male', null]],
      parents: [['Gran', 'Paul'], ['Gran', 'Pia'], ['Paul', 'Carl'], ['Pia', 'Cora'], ['Carl', 'Kid'], ['Cora', 'Kid']],
      partners: [['Carl', 'Cora']],
    },
    expected: { repeats: ['Kid'] },
  },
  {
    id: 'a person with no relatives belongs to no line',
    script: { people: [['Solo', 'unknown', null]] },
    expected: { generations: { Solo: 0 }, tones: { Solo: 'other' }, lineHeads: [] },
  },
  {
    id: 'lines beyond the eight colours fold into other branches',
    script: { people: [['F', 'male', null], ...NINE_CHILDREN.map((name) => [name, 'male', null] as const)], parents: NINE_CHILDREN.map((name) => ['F', name] as const) },
    expected: { tones: { F: 'trunk', C1: 'line 0', C8: 'line 7', C9: 'other' }, lineHeads: NINE_CHILDREN.slice(0, 8) },
  },
];

test.each(CASES)('$id', ({ script, expected }) => {
  expect(observedLayout(script, expected)).toEqual(expect.objectContaining(expected));
});

test('every generation gets its own ring and nobody overlaps on it', () => {
  const people = familyOfThrees();
  const layout = layoutTower(towerGraphOf(people));
  const nodes = [...layout.nodes.values()];
  expect(layout.rings.map((ring) => ring.label)).toEqual(['Generation 1', 'Generation 2', 'Generation 3', 'Generation 4']);
  expect(nodes.every((node) => node.position.y === node.generation * GENERATION_HEIGHT)).toBe(true);
  expect(closestNeighbourDistance(nodes)).toBeGreaterThan(SPHERE_GAP * 0.85);
});

test('the years axis draws a ring every decade and labels every fifty years', () => {
  const layout = layoutTower(towerGraphOf({ people: [['Anna', 'female', 1803], ['Boris', 'male', 1862]], parents: [['Anna', 'Boris']] }));
  expect(layout.rings.map((ring) => Math.round(ring.y * 1000) / 1000)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(layout.rings.filter((ring) => ring.isMajor).map((ring) => ring.label)).toEqual(['1800', '1850']);
});

test('a large dated family lays out quickly with everyone apart', () => {
  const family = generatedFamily({ seed: 7, ancestorGenerations: 6, descendantGenerations: 4, maxPartners: 2, maxChildren: 4 });
  const startedAt = performance.now();
  const layout = layoutTower(indexTreeGraph(family));
  expect(performance.now() - startedAt).toBeLessThan(1500);
  expect(layout.nodes.size).toBe(family.people.length);
  expect([...layout.nodes.values()].every((node) => Number.isFinite(node.position.x + node.position.y + node.position.z))).toBe(true);
});

function observedLayout(script: TowerScript, expected: LayoutExpectation): LayoutExpectation {
  const graph = towerGraphOf(script);
  const layout = layoutTower(graph);
  const nodeOf = (name: string): TowerNode | undefined => layout.nodes.get(personIdOf(graph, name));
  const namesWhere = (isMatch: (node: TowerNode) => boolean): string[] => namesOf(graph, [...layout.nodes.values()].filter(isMatch).map((node) => node.person.id));
  return {
    axis: layout.axis,
    generations: Object.fromEntries(Object.keys(expected.generations ?? {}).map((name) => [name, nodeOf(name)?.generation ?? -1])),
    tones: Object.fromEntries(Object.keys(expected.tones ?? {}).map((name) => [name, toneLabel(nodeOf(name)?.tone)])),
    lineHeads: lineHeadNames(layout),
    estimated: namesWhere((node) => node.isEstimated),
    repeats: namesWhere((node) => node.isRepeat),
  };
}

function toneLabel(tone: NodeTone | undefined): string {
  if (tone === undefined) {
    return 'missing';
  }
  return tone.kind === 'line' ? `line ${String(tone.lineIndex)}` : tone.kind;
}

function lineHeadNames(layout: TowerLayout): string[] {
  return layout.legend.lines.map((line) => line.head.given_names);
}

function familyOfThrees(): TowerScript {
  const generations = [['G0'], ['G1a', 'G1b', 'G1c']];
  const parents: (readonly [string, string])[] = generations[1]?.map((child) => ['G0', child] as const) ?? [];
  for (let depth = 2; depth < 4; depth += 1) {
    const children = (generations[depth - 1] ?? []).flatMap((parent) => ['a', 'b', 'c'].map((suffix) => `${parent}${suffix}`));
    generations.push(children);
    parents.push(...children.map((child) => [child.slice(0, -1), child] as const));
  }
  return { people: generations.flat().map((name) => [name, 'unknown', null] as const), parents };
}

function closestNeighbourDistance(nodes: readonly TowerNode[]): number {
  const distances = nodes.flatMap((node, position) =>
    nodes.slice(position + 1).filter((other) => other.generation === node.generation).map((other) => Math.hypot(node.position.x - other.position.x, node.position.z - other.position.z)),
  );
  return Math.min(...distances);
}
