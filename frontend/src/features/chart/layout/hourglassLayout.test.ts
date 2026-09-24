import { describe, expect, it } from 'vitest';
import type { FamilyChart } from '../../../api/types';
import { type FamilyScript, familyChart, type ParentLine } from '../testing/familyScript';
import { generatedFamily, type GeneratorSettings } from '../testing/generatedFamily';
import { CARD_HEIGHT, CARD_WIDTH, PARTNER_PITCH, rowCentreY } from './geometry';
import { layoutHourglass } from './hourglassLayout';
import type { ChartNode, HourglassLayout } from './types';

interface LayoutCase {
  readonly id: string;
  readonly script: FamilyScript;
  readonly rows: Readonly<Record<string, readonly string[]>>;
  readonly dashedChildren?: readonly string[];
}

const SINGLE_PERSON: FamilyScript = { focus: 'Ada', people: [['Ada', 'female', 1815]] };

const GRANDPARENTS: FamilyScript = {
  focus: 'Charles',
  people: [
    ['Charles', 'male', 1809],
    ['Susannah', 'female', 1765],
    ['Robert', 'male', 1766],
    ['Sarah', 'female', 1734],
    ['Josiah', 'male', 1730],
    ['Mary', 'female', 1740],
    ['Erasmus', 'male', 1731],
  ],
  parents: [
    ['Susannah', 'Charles'],
    ['Robert', 'Charles'],
    ['Sarah', 'Susannah'],
    ['Josiah', 'Susannah'],
    ['Mary', 'Robert'],
    ['Erasmus', 'Robert'],
  ],
  partners: [['Robert', 'Susannah', 1796]],
};

const COUSIN_PARENTS: FamilyScript = {
  focus: 'George',
  people: [
    ['George', 'male', 1845],
    ['Charles', 'male', 1809],
    ['Emma', 'female', 1808],
    ['Robert', 'male', 1766],
    ['Susannah', 'female', 1765],
    ['Josiah II', 'male', 1769],
    ['Bessy', 'female', 1764],
    ['Josiah I', 'male', 1730],
    ['Sarah', 'female', 1734],
  ],
  parents: [
    ['Charles', 'George'],
    ['Emma', 'George'],
    ['Robert', 'Charles'],
    ['Susannah', 'Charles'],
    ['Josiah II', 'Emma'],
    ['Bessy', 'Emma'],
    ['Josiah I', 'Susannah'],
    ['Sarah', 'Susannah'],
    ['Josiah I', 'Josiah II'],
    ['Sarah', 'Josiah II'],
  ],
};

const THREE_CHILDREN: FamilyScript = {
  focus: 'Charles',
  people: [
    ['Charles', 'male', 1809],
    ['Emma', 'female', 1808],
    ['Henrietta', 'female', null],
    ['Anne', 'female', 1841],
    ['William', 'male', 1839],
  ],
  parents: ['Henrietta', 'Anne', 'William'].flatMap((child): ParentLine[] => [
    ['Charles', child],
    ['Emma', child],
  ]),
  partners: [['Charles', 'Emma', 1839]],
};

const TWO_PARTNERSHIPS: FamilyScript = {
  focus: 'Erasmus',
  people: [
    ['Erasmus', 'male', 1731],
    ['Elizabeth', 'female', 1747],
    ['Mary', 'female', 1740],
    ['Violetta', 'female', 1783],
    ['Robert', 'male', 1766],
    ['Francis', 'male', 1786],
    ['Charles', 'male', 1758],
  ],
  parents: [
    ['Erasmus', 'Violetta'],
    ['Elizabeth', 'Violetta'],
    ['Erasmus', 'Francis'],
    ['Elizabeth', 'Francis'],
    ['Erasmus', 'Robert'],
    ['Mary', 'Robert'],
    ['Erasmus', 'Charles'],
    ['Mary', 'Charles'],
  ],
  partners: [
    ['Erasmus', 'Elizabeth', 1781],
    ['Mary', 'Erasmus', 1757],
  ],
};

const THREE_PARTNERSHIPS: FamilyScript = {
  focus: 'Francis',
  people: [
    ['Francis', 'male', 1848],
    ['Amy', 'female', 1850],
    ['Ellen', 'female', 1856],
    ['Florence', 'female', 1864],
    ['Bernard', 'male', 1876],
    ['Frances', 'female', 1886],
  ],
  parents: [
    ['Francis', 'Bernard'],
    ['Amy', 'Bernard'],
    ['Francis', 'Frances'],
    ['Ellen', 'Frances'],
  ],
  partners: [
    ['Francis', 'Florence', 1913],
    ['Francis', 'Amy', 1874],
    ['Francis', 'Ellen', 1883],
  ],
};

const SINGLE_PARENT: FamilyScript = {
  focus: 'Mary',
  people: [
    ['Mary', 'female', 1800],
    ['Tom', 'male', 1825],
  ],
  parents: [['Mary', 'Tom']],
};

const ADOPTED_CHILD: FamilyScript = {
  focus: 'Ann',
  people: [
    ['Ann', 'female', 1950],
    ['Bob', 'male', 1948],
    ['Dan', 'male', 1980],
    ['Cara', 'female', 1975],
  ],
  parents: [
    ['Ann', 'Cara'],
    ['Bob', 'Cara'],
    ['Ann', 'Dan', 'adopted'],
    ['Bob', 'Dan', 'adopted'],
  ],
  partners: [['Ann', 'Bob', 1972]],
};

const BIRTH_AND_ADOPTIVE_PARENTS: FamilyScript = {
  focus: 'Dan',
  people: [
    ['Dan', 'male', 1980],
    ['Ann', 'female', 1950],
    ['Bob', 'male', 1948],
    ['Eve', 'female', 1961],
  ],
  parents: [
    ['Ann', 'Dan', 'adopted'],
    ['Bob', 'Dan', 'foster'],
    ['Eve', 'Dan'],
  ],
};

const CO_PARENT_WITHOUT_PARTNERSHIP: FamilyScript = {
  focus: 'Erasmus',
  people: [
    ['Erasmus', 'male', 1731],
    ['Mary Parker', 'female', 1753],
    ['Susanna', 'female', 1772],
  ],
  parents: [
    ['Erasmus', 'Susanna'],
    ['Mary Parker', 'Susanna'],
  ],
};

const COUSIN_MARRIAGE_BELOW: FamilyScript = {
  focus: 'Josiah I',
  people: [
    ['Josiah I', 'male', 1730],
    ['Sarah', 'female', 1734],
    ['Susannah', 'female', 1765],
    ['Josiah II', 'male', 1769],
    ['Robert', 'male', 1766],
    ['Bessy', 'female', 1764],
    ['Charles', 'male', 1809],
    ['Emma', 'female', 1808],
    ['William', 'male', 1839],
  ],
  parents: [
    ['Josiah I', 'Susannah'],
    ['Sarah', 'Susannah'],
    ['Josiah I', 'Josiah II'],
    ['Sarah', 'Josiah II'],
    ['Robert', 'Charles'],
    ['Susannah', 'Charles'],
    ['Josiah II', 'Emma'],
    ['Bessy', 'Emma'],
    ['Charles', 'William'],
    ['Emma', 'William'],
  ],
  partners: [
    ['Josiah I', 'Sarah', 1764],
    ['Susannah', 'Robert', 1796],
    ['Josiah II', 'Bessy', 1792],
    ['Charles', 'Emma', 1839],
  ],
};

const DUPLICATED_LINKS: FamilyScript = {
  focus: 'Tom',
  people: [
    ['Tom', 'male', 1825],
    ['Mary', 'female', 1800],
    ['Ann', 'female', 1850],
  ],
  parents: [
    ['Mary', 'Tom'],
    ['Mary', 'Tom', 'adopted'],
    ['Tom', 'Ann'],
    ['Tom', 'Ann'],
  ],
};

const CYCLIC_DATA: FamilyScript = {
  focus: 'Ann',
  people: [
    ['Ann', 'female', 1900],
    ['Ben', 'male', 1901],
  ],
  parents: [
    ['Ann', 'Ben'],
    ['Ben', 'Ann'],
  ],
};

const LAYOUT_CASES: readonly LayoutCase[] = [
  { id: 'a single person', script: SINGLE_PERSON, rows: { '0': ['Ada'] } },
  {
    id: 'parents and grandparents',
    script: GRANDPARENTS,
    rows: { '-2': ['Erasmus', 'Mary', 'Josiah', 'Sarah'], '-1': ['Robert', 'Susannah'], '0': ['Charles'] },
  },
  {
    id: 'pedigree collapse through cousin parents',
    script: COUSIN_PARENTS,
    rows: {
      '-3': ['Josiah I', 'Sarah', 'Josiah I (repeat)', 'Sarah (repeat)'],
      '-2': ['Robert', 'Susannah', 'Josiah II', 'Bessy'],
      '-1': ['Charles', 'Emma'],
      '0': ['George'],
    },
  },
  {
    id: 'a couple with three children',
    script: THREE_CHILDREN,
    rows: { '0': ['Charles', 'Emma'], '1': ['William', 'Anne', 'Henrietta'] },
  },
  {
    id: 'two partnerships with children from each',
    script: TWO_PARTNERSHIPS,
    rows: { '0': ['Mary', 'Erasmus', 'Elizabeth'], '1': ['Charles', 'Robert', 'Violetta', 'Francis'] },
  },
  {
    id: 'three partnerships',
    script: THREE_PARTNERSHIPS,
    rows: { '0': ['Amy', 'Francis', 'Ellen', 'Florence'], '1': ['Bernard', 'Frances'] },
  },
  { id: 'a single parent', script: SINGLE_PARENT, rows: { '0': ['Mary'], '1': ['Tom'] } },
  {
    id: 'an adopted child',
    script: ADOPTED_CHILD,
    rows: { '0': ['Ann', 'Bob'], '1': ['Cara', 'Dan'] },
    dashedChildren: ['Dan'],
  },
  {
    id: 'birth and adoptive parents',
    script: BIRTH_AND_ADOPTIVE_PARENTS,
    rows: { '-1': ['Eve', 'Bob', 'Ann'], '0': ['Dan'] },
    dashedChildren: ['Dan'],
  },
  {
    id: 'a co-parent without a partnership',
    script: CO_PARENT_WITHOUT_PARTNERSHIP,
    rows: { '0': ['Erasmus', 'Mary Parker'], '1': ['Susanna'] },
  },
  {
    id: 'cousins marrying among the descendants',
    script: COUSIN_MARRIAGE_BELOW,
    rows: {
      '0': ['Josiah I', 'Sarah'],
      '1': ['Susannah', 'Robert', 'Josiah II', 'Bessy'],
      '2': ['Charles', 'Emma', 'Emma (repeat)', 'Charles (repeat)'],
      '3': ['William', 'William (repeat)'],
    },
  },
  { id: 'a parent link recorded twice', script: DUPLICATED_LINKS, rows: { '-1': ['Mary'], '0': ['Tom'], '1': ['Ann'] } },
  { id: 'a cycle in the data', script: CYCLIC_DATA, rows: { '-1': ['Ben'], '0': ['Ann'], '1': ['Ben (repeat)'] } },
];

const GENERATED_SETTINGS: readonly GeneratorSettings[] = Array.from({ length: 36 }, (_, position) => ({
  seed: position + 1,
  ancestorGenerations: position % 6,
  descendantGenerations: (position + 2) % 5,
  maxPartners: position % 4,
  maxChildren: 1 + (position % 4),
}));

describe.each(LAYOUT_CASES)('layoutHourglass with $id', ({ script, rows, dashedChildren = [] }) => {
  const layout = layoutHourglass(familyChart(script));

  it('places every occurrence in its generation row, left to right', () => {
    expect(rowsOf(layout)).toEqual(rows);
  });

  it('dashes exactly the lines to children with a non-birth parent link', () => {
    expect(dashedChildNames(layout)).toEqual(dashedChildren);
  });

  it('keeps the focus person at the origin', () => {
    const focusNodes = layout.nodes.filter((node) => node.isFocus);
    expect(focusNodes.map((node) => [node.person.given_names, node.x, node.y])).toEqual([[script.focus, 0, 0]]);
  });

  it('satisfies every drawing invariant', () => {
    expect(invariantViolations(layout)).toEqual([]);
  });
});

describe('layoutHourglass centring', () => {
  it('centres each ancestor couple over their child', () => {
    const layout = layoutHourglass(familyChart(GRANDPARENTS));
    expect(xOf(layout, 'Charles')).toBe(midpoint(xOf(layout, 'Robert'), xOf(layout, 'Susannah')));
    expect(xOf(layout, 'Robert')).toBe(midpoint(xOf(layout, 'Erasmus'), xOf(layout, 'Mary')));
    expect(xOf(layout, 'Susannah')).toBe(midpoint(xOf(layout, 'Josiah'), xOf(layout, 'Sarah')));
  });

  it('centres children under the couple that are both their parents', () => {
    const layout = layoutHourglass(familyChart(THREE_CHILDREN));
    const childrenCentre = midpoint(xOf(layout, 'William'), xOf(layout, 'Henrietta'));
    expect(childrenCentre).toBe(midpoint(xOf(layout, 'Charles'), xOf(layout, 'Emma')));
  });

  it('puts a child whose other parent is not in the chart under the one parent', () => {
    const layout = layoutHourglass(familyChart(SINGLE_PARENT));
    expect(xOf(layout, 'Tom')).toBe(xOf(layout, 'Mary'));
  });
});

describe('layoutHourglass partnerships', () => {
  it('seats earlier partners left of later ones and hangs each family under its own couple', () => {
    const layout = layoutHourglass(familyChart(TWO_PARTNERSHIPS));
    expect([xOf(layout, 'Mary'), xOf(layout, 'Elizabeth')]).toEqual([-PARTNER_PITCH, PARTNER_PITCH]);
    expect(midpoint(xOf(layout, 'Charles'), xOf(layout, 'Robert'))).toBeLessThan(0);
    expect(midpoint(xOf(layout, 'Violetta'), xOf(layout, 'Francis'))).toBeGreaterThan(0);
  });

  it('routes a partnership line over the partners seated in between', () => {
    const layout = layoutHourglass(familyChart(THREE_PARTNERSHIPS));
    const partnershipLines = layout.edges.filter((edge) => edge.kind === 'partnership');
    const highestPoints = partnershipLines.map((edge) => Math.min(...edge.points.map((point) => point.y)));
    expect(highestPoints.filter((y) => y < rowCentreY(0) - CARD_HEIGHT / 2)).toHaveLength(1);
  });
});

describe('layoutHourglass with imperfect data', () => {
  it('ignores links and partnerships that reach people outside the chart', () => {
    const chart = familyChart(THREE_CHILDREN);
    const withStrayLinks: FamilyChart = {
      ...chart,
      parent_links: [...chart.parent_links, { id: 99, parent_id: 500, child_id: chart.focus_id, kind: 'birth' }],
      partnerships: [...chart.partnerships, { ...partnershipOf(chart), id: 99, second_partner_id: 501 }],
    };
    expect(layoutHourglass(withStrayLinks)).toEqual(layoutHourglass(chart));
  });

  it('returns an empty layout when the focus person is missing', () => {
    const chart = familyChart(SINGLE_PERSON);
    const emptyBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    expect(layoutHourglass({ ...chart, focus_id: 404 })).toEqual({ nodes: [], edges: [], bounds: emptyBounds });
  });
});

describe('layoutHourglass determinism and speed', () => {
  it('gives the same layout for the same family however the lists are ordered', () => {
    const chart = familyChart(COUSIN_MARRIAGE_BELOW);
    const reordered: FamilyChart = {
      ...chart,
      people: chart.people.toReversed(),
      parent_links: chart.parent_links.toReversed(),
      partnerships: chart.partnerships.toReversed(),
    };
    expect(layoutHourglass(reordered)).toEqual(layoutHourglass(chart));
  });

  it.each(GENERATED_SETTINGS)('keeps generated family $seed free of overlaps and inside its bounds', (settings) => {
    const chart = generatedFamily(settings);
    const layout = layoutHourglass(chart);
    expect(invariantViolations(layout)).toEqual([]);
    expect(layoutHourglass(chart)).toEqual(layout);
  });

  it('lays out a family of more than 500 people in well under 150 ms', () => {
    const chart = generatedFamily({ seed: 8, ancestorGenerations: 8, descendantGenerations: 5, maxPartners: 2, maxChildren: 4 });
    const durations = Array.from({ length: 5 }, () => millisecondsToLayOut(chart));
    expect(layoutHourglass(chart).nodes.length).toBeGreaterThan(500);
    expect(Math.min(...durations)).toBeLessThan(150);
  });
});

function millisecondsToLayOut(chart: FamilyChart): number {
  const startedAt = performance.now();
  layoutHourglass(chart);
  return performance.now() - startedAt;
}

function rowsOf(layout: HourglassLayout): Record<string, string[]> {
  return layout.nodes.reduce<Record<string, string[]>>((rows, node) => {
    const row = String(node.generation);
    return { ...rows, [row]: [...(rows[row] ?? []), labelOf(node)] };
  }, {});
}

function labelOf(node: ChartNode): string {
  return node.isRepeat ? `${node.person.given_names} (repeat)` : node.person.given_names;
}

function dashedChildNames(layout: HourglassLayout): string[] {
  const namesByKey = new Map(layout.nodes.map((node) => [node.key, node.person.given_names]));
  const dashedEdges = layout.edges.filter((edge) => edge.isDashed);
  return dashedEdges.map((edge) => namesByKey.get(edge.key.split('>')[1] ?? '') ?? edge.key).toSorted();
}

function invariantViolations(layout: HourglassLayout): string[] {
  return [...overlappingCards(layout), ...pointsOutsideBounds(layout), ...slantedSegments(layout)];
}

function overlappingCards(layout: HourglassLayout): string[] {
  return layout.nodes.flatMap((node, position) => {
    const next = layout.nodes[position + 1];
    return next?.generation === node.generation && next.x - node.x < CARD_WIDTH ? [`${node.key} overlaps ${next.key}`] : [];
  });
}

function pointsOutsideBounds(layout: HourglassLayout): string[] {
  const { minX, minY, maxX, maxY } = layout.bounds;
  const cardCorners = layout.nodes.flatMap((node) => [
    { x: node.x - CARD_WIDTH / 2, y: node.y - CARD_HEIGHT / 2 },
    { x: node.x + CARD_WIDTH / 2, y: node.y + CARD_HEIGHT / 2 },
  ]);
  const points = [...cardCorners, ...layout.edges.flatMap((edge) => edge.points)];
  return points.filter(({ x, y }) => x < minX || x > maxX || y < minY || y > maxY).map(({ x, y }) => `(${String(x)}, ${String(y)})`);
}

function slantedSegments(layout: HourglassLayout): string[] {
  return layout.edges.flatMap((edge) =>
    edge.points.flatMap((point, position) => {
      const next = edge.points[position + 1];
      const isSlanted = next !== undefined && next.x !== point.x && next.y !== point.y;
      return isSlanted ? [`${edge.key} slants at point ${String(position)}`] : [];
    }),
  );
}

function xOf(layout: HourglassLayout, name: string): number {
  const node = layout.nodes.find((candidate) => candidate.person.given_names === name && !candidate.isRepeat);
  if (node === undefined) {
    throw new Error(`${name} is not in the layout.`);
  }
  return node.x;
}

function midpoint(first: number, second: number): number {
  return (first + second) / 2;
}

function partnershipOf(chart: FamilyChart): FamilyChart['partnerships'][number] {
  const [partnership] = chart.partnerships;
  if (partnership === undefined) {
    throw new Error('The chart has no partnership.');
  }
  return partnership;
}
