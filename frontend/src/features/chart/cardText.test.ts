import { describe, expect, it } from 'vitest';
import { initialsOf } from '../../design/components';
import { cardLines, nameLines, personLabel } from './cardText';
import type { ChartNode } from './layout/types';
import { personSummary, yearDate } from './testing/familyScript';

describe('nameLines', () => {
  it.each([
    [{ given_names: 'Charles Robert', surname: 'Darwin' }, ['Charles Robert', 'Darwin']],
    [{ given_names: 'Bernard Richard Meirion', surname: 'Darwin' }, ['Bernard Richar…', 'Darwin']],
    [{ given_names: 'Mary Parker', surname: '' }, ['Mary Parker']],
    [{ given_names: 'Mary Anne Elizabeth', surname: '' }, ['Mary Anne', 'Elizabeth']],
    [{ given_names: '', surname: 'Wedgwood' }, ['Wedgwood']],
    [{ given_names: 'Wolfeschlegelsteinhausen', surname: '' }, ['Wolfeschlegels…']],
    [{ given_names: 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff', surname: '' }, ['Hubert Blaine', 'Wolfeschlegels…']],
    [{ given_names: ' ', surname: ' ' }, ['Unnamed person']],
  ])('writes %o as %o', (person, lines) => {
    expect(nameLines(person)).toEqual(lines);
  });
});

describe('cardLines', () => {
  it('adds the life years under the name', () => {
    const person = personSummary({ id: 1, given_names: 'Emma', surname: 'Wedgwood', birth_date: yearDate(1808), death_date: yearDate(1896), is_deceased: true });
    expect(cardLines(person)).toEqual([
      { text: 'Emma', tone: 'name' },
      { text: 'Wedgwood', tone: 'name' },
      { text: '1808–1896', tone: 'years' },
    ]);
  });

  it('leaves the years out when nothing is known about them', () => {
    expect(cardLines(personSummary({ id: 1, given_names: 'Emma' }))).toEqual([{ text: 'Emma', tone: 'name' }]);
  });
});

describe('initialsOf', () => {
  it.each([
    [{ given_names: 'Charles Robert', surname: 'Darwin' }, 'CD'],
    [{ given_names: 'élise', surname: '' }, 'É'],
    [{ given_names: '', surname: '' }, '?'],
  ])('abbreviates %o as %s', (person, initials) => {
    expect(initialsOf(person)).toBe(initials);
  });
});

describe('personLabel', () => {
  const emma = personSummary({ id: 2, given_names: 'Emma', surname: 'Wedgwood', birth_date: yearDate(1808) });
  const node: ChartNode = { key: '2', person: emma, x: 0, y: 0, generation: 0, isFocus: false, isRepeat: false };

  it.each([
    [node, 'Emma Wedgwood, b. 1808'],
    [{ ...node, isRepeat: true }, 'Emma Wedgwood, b. 1808, also shown elsewhere in this tree'],
    [{ ...node, person: { ...emma, birth_date: null } }, 'Emma Wedgwood'],
  ])('names %o for assistive technology', (labelled, label) => {
    expect(personLabel(labelled)).toBe(label);
  });
});
