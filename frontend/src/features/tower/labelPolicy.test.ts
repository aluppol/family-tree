import { expect, test } from 'vitest';
import { ALL_NAMES_LIMIT, RELATIVE_LABEL_LIMIT, closeFamilyIds, highlightedIds, labelledIds } from './labelPolicy';
import { type TowerScript, namesOf, personIdOf, towerGraphOf } from './testing/towerScript';

const FAMILY = towerGraphOf({
  people: [['Jovan', 'male', null], ['Petar', 'male', null], ['Marko', 'male', null], ['Ana', 'female', null], ['Mara', 'female', null], ['Lazar', 'male', null]],
  parents: [['Jovan', 'Petar'], ['Jovan', 'Marko'], ['Petar', 'Ana'], ['Marko', 'Lazar']],
  partners: [['Petar', 'Mara']],
});

test('the close family is the person, the parents, the spouses and the children', () => {
  expect(namesOf(FAMILY, closeFamilyIds(FAMILY, personIdOf(FAMILY, 'Petar')))).toEqual(['Petar', 'Jovan', 'Mara', 'Ana']);
});

test('highlighting adds the people on the relationship path', () => {
  const pathIds = [personIdOf(FAMILY, 'Marko'), personIdOf(FAMILY, 'Lazar')];
  const highlighted = highlightedIds({ graph: FAMILY, focusId: personIdOf(FAMILY, 'Ana'), pathIds });
  expect(namesOf(FAMILY, highlighted).sort()).toEqual(['Ana', 'Lazar', 'Marko', 'Petar']);
});

test('labels name the close family and the path when all names are off', () => {
  const labelled = labelledIds({ graph: FAMILY, focusId: personIdOf(FAMILY, 'Marko'), pathIds: [personIdOf(FAMILY, 'Mara')], isAllNames: false });
  expect(namesOf(FAMILY, labelled)).toEqual(['Marko', 'Mara', 'Jovan', 'Lazar']);
});

test('all names label everyone in a small tree, the nearest first', () => {
  const labelled = labelledIds({ graph: FAMILY, focusId: personIdOf(FAMILY, 'Lazar'), pathIds: [], isAllNames: true });
  expect(namesOf(FAMILY, labelled)).toEqual(['Lazar', 'Marko', 'Jovan', 'Petar', 'Mara', 'Ana']);
});

test('labels stay within their limits in a large family', () => {
  const large = towerGraphOf(largeFamily(300));
  const focusId = personIdOf(large, 'Root');
  expect(labelledIds({ graph: large, focusId, pathIds: [], isAllNames: false }).size).toBe(RELATIVE_LABEL_LIMIT);
  expect(labelledIds({ graph: large, focusId, pathIds: [], isAllNames: true }).size).toBe(ALL_NAMES_LIMIT);
});

function largeFamily(childCount: number): TowerScript {
  const children = Array.from({ length: childCount }, (_, position) => `Child ${String(position + 1)}`);
  return { people: [['Root', 'male', null], ...children.map((name) => [name, 'unknown', null] as const)], parents: children.map((name) => ['Root', name] as const) };
}
