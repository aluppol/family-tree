import { expect, test } from 'vitest';
import { personSummary } from '../chart/testing/familyScript';
import { foldForSearch, searchPeople } from './personSearch';

const PEOPLE = [
  personSummary({ id: 1, given_names: 'Čedomir', surname: 'Petrović' }),
  personSummary({ id: 2, given_names: 'Đorđe', surname: 'Jovanović' }),
  personSummary({ id: 3, given_names: 'Dragomir', surname: 'Petrović' }),
  personSummary({ id: 4, given_names: 'Ana', surname: 'Dragić' }),
  personSummary({ id: 5, given_names: '', surname: '' }),
];

const SEARCH_CASES = [
  { id: 'letters with marks match plain letters', query: 'cedomir', expected: [1] },
  { id: 'Đ folds to D', query: 'dorde', expected: [2] },
  { id: 'every word must match, in any order', query: 'petrovic drag', expected: [3] },
  { id: 'names that start with the query come first', query: 'drag', expected: [3, 4] },
  { id: 'an empty query finds no one', query: '   ', expected: [] },
];

test.each(SEARCH_CASES)('$id', ({ query, expected }) => {
  expect(searchPeople(PEOPLE, query, 10).map((person) => person.id)).toEqual(expected);
});

test('the result list is cut at the limit', () => {
  expect(searchPeople(PEOPLE, 'r', 2)).toHaveLength(2);
});

test('folding removes marks and special letters and lowers the case', () => {
  expect(foldForSearch('ŁÓDŹ Øre Æsir Straße Đakovica')).toBe('lodz ore aesir strasse dakovica');
});
