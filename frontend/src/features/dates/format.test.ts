import { describe, expect, it } from 'vitest';
import type { GenealogicalDate, PersonSummary } from '../../api/types';
import { formatCalendarDate, formatGenealogicalDate, formatLifeYears, formatYear, monthName } from './format';

function exact(year: number, month: number | null = null, day: number | null = null): GenealogicalDate {
  return { qualifier: 'exact', value: { year, month, day }, until: null };
}

describe('formatCalendarDate', () => {
  it.each([
    [{ year: 1809, month: 2, day: 12 }, '12 Feb 1809'],
    [{ year: 1809, month: 2, day: null }, 'Feb 1809'],
    [{ year: 1809, month: null, day: null }, '1809'],
  ])('formats %o as %s', (date, expected) => {
    expect(formatCalendarDate(date)).toBe(expected);
  });
});

describe('formatGenealogicalDate', () => {
  it.each<[GenealogicalDate, string]>([
    [exact(1809, 2, 12), '12 Feb 1809'],
    [{ ...exact(1765), qualifier: 'about' }, 'about 1765'],
    [{ ...exact(1765), qualifier: 'calculated' }, 'calculated 1765'],
    [{ ...exact(1765), qualifier: 'estimated' }, 'estimated 1765'],
    [{ ...exact(1790, 3), qualifier: 'before' }, 'before Mar 1790'],
    [{ ...exact(1790), qualifier: 'after' }, 'after 1790'],
    [{ qualifier: 'between', value: { year: 1760, month: null, day: null }, until: { year: 1762, month: 5, day: null } }, 'between 1760 and May 1762'],
  ])('formats %o as %s', (date, expected) => {
    expect(formatGenealogicalDate(date)).toBe(expected);
  });
});

describe('formatYear', () => {
  it.each<[GenealogicalDate, string]>([
    [exact(1809, 2, 12), '1809'],
    [{ ...exact(1765), qualifier: 'about' }, 'c. 1765'],
    [{ ...exact(1790), qualifier: 'before' }, 'bef. 1790'],
    [{ ...exact(1790), qualifier: 'after' }, 'aft. 1790'],
  ])('shortens %o to %s', (date, expected) => {
    expect(formatYear(date)).toBe(expected);
  });
});

describe('formatLifeYears', () => {
  const living: Pick<PersonSummary, 'birth_date' | 'death_date' | 'is_deceased'> = {
    birth_date: exact(1809),
    death_date: null,
    is_deceased: false,
  };

  it.each([
    [{ ...living, death_date: exact(1882), is_deceased: true }, '1809–1882'],
    [{ ...living, is_deceased: true }, '1809–?'],
    [living, 'b. 1809'],
    [{ ...living, birth_date: null }, ''],
    [{ ...living, birth_date: null, death_date: exact(1882), is_deceased: true }, '?–1882'],
  ])('renders %o as %s', (person, expected) => {
    expect(formatLifeYears(person)).toBe(expected);
  });
});

describe('monthName', () => {
  it('falls back to the number outside 1–12', () => {
    expect(monthName(13)).toBe('13');
  });
});
