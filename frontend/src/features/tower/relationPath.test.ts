import { expect, test } from 'vitest';
import type { Sex } from '../../api/types';
import { type Relation, peopleOnPath, relationPath, relationWord } from './relationPath';
import { namesOf, personIdOf, towerGraphOf } from './testing/towerScript';

const FAMILY = towerGraphOf({
  people: [['Jovan', 'male', null], ['Petar', 'male', null], ['Marko', 'male', null], ['Ana', 'female', null], ['Mara', 'female', null], ['Solo', 'unknown', null]],
  parents: [['Jovan', 'Petar'], ['Jovan', 'Marko'], ['Marko', 'Ana']],
  partners: [['Petar', 'Mara']],
});

interface PathCase {
  id: string;
  from: string;
  to: string;
  expected: string[] | null;
}

const PATH_CASES: PathCase[] = [
  { id: 'a parent is one step up', from: 'Petar', to: 'Jovan', expected: ['parent Jovan'] },
  { id: 'a cousin path goes up to the shared ancestor and down again', from: 'Mara', to: 'Ana', expected: ['spouse Petar', 'parent Jovan', 'child Marko', 'child Ana'] },
  { id: 'the same person needs no steps', from: 'Ana', to: 'Ana', expected: [] },
  { id: 'an unconnected person has no path', from: 'Ana', to: 'Solo', expected: null },
];

test.each(PATH_CASES)('$id', ({ from, to, expected }) => {
  const steps = relationPath(FAMILY, { fromId: personIdOf(FAMILY, from), toId: personIdOf(FAMILY, to) });
  expect(steps?.map((step) => `${step.relation} ${namesOf(FAMILY, [step.toId]).join('')}`) ?? null).toEqual(expected);
});

test('the people on a path are listed once, in walking order', () => {
  const steps = relationPath(FAMILY, { fromId: personIdOf(FAMILY, 'Mara'), toId: personIdOf(FAMILY, 'Ana') }) ?? [];
  expect(namesOf(FAMILY, peopleOnPath(steps))).toEqual(['Mara', 'Petar', 'Jovan', 'Marko', 'Ana']);
});

const WORD_CASES: { relation: Relation; sex: Sex; expected: string }[] = [
  { relation: 'parent', sex: 'male', expected: 'Father' },
  { relation: 'parent', sex: 'female', expected: 'Mother' },
  { relation: 'parent', sex: 'unknown', expected: 'Parent' },
  { relation: 'child', sex: 'male', expected: 'Son' },
  { relation: 'child', sex: 'female', expected: 'Daughter' },
  { relation: 'child', sex: 'other', expected: 'Child' },
  { relation: 'spouse', sex: 'male', expected: 'Husband' },
  { relation: 'spouse', sex: 'female', expected: 'Wife' },
  { relation: 'spouse', sex: 'unknown', expected: 'Spouse' },
];

test.each(WORD_CASES)('a $sex $relation is called $expected', ({ relation, sex, expected }) => {
  expect(relationWord(relation, sex)).toBe(expected);
});
