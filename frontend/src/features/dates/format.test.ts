import { describe, expect, it } from 'vitest';
import type { GenealogicalDate, PersonSummary } from '../../api/types';
import { ru } from '../../i18n/ru';
import { ENGLISH, RUSSIAN, SERBIAN } from '../../test/translators';
import { formatCalendarDate, formatGenealogicalDate, formatLifeYears, formatYear, monthName, monthOptionLabels } from './format';

function exact(year: number, month: number | null = null, day: number | null = null): GenealogicalDate {
  return { qualifier: 'exact', value: { year, month, day }, until: null };
}

describe('formatCalendarDate', () => {
  it.each([
    [{ year: 1809, month: 2, day: 12 }, '12 Feb 1809'],
    [{ year: 1809, month: 2, day: null }, 'Feb 1809'],
    [{ year: 1809, month: null, day: null }, '1809'],
  ])('formats %o as %s', (date, expected) => {
    expect(formatCalendarDate(ENGLISH, date)).toBe(expected);
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
    expect(formatGenealogicalDate(ENGLISH, date)).toBe(expected);
  });
});

describe('formatYear', () => {
  it.each<[GenealogicalDate, string]>([
    [exact(1809, 2, 12), '1809'],
    [{ ...exact(1765), qualifier: 'about' }, 'c. 1765'],
    [{ ...exact(1790), qualifier: 'before' }, 'bef. 1790'],
    [{ ...exact(1790), qualifier: 'after' }, 'aft. 1790'],
  ])('shortens %o to %s', (date, expected) => {
    expect(formatYear(ENGLISH, date)).toBe(expected);
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
    expect(formatLifeYears(ENGLISH, person)).toBe(expected);
  });
});

describe('monthName', () => {
  it('falls back to the number outside 1–12', () => {
    expect(monthName(ENGLISH, 13)).toBe('13');
    expect(formatCalendarDate(ENGLISH, { year: 1809, month: 13, day: null })).toBe('13 1809');
  });

  it('names every month of the date field in full', () => {
    expect(monthOptionLabels(ENGLISH)).toEqual(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
  });
});

const between = (value: GenealogicalDate['value'], until: GenealogicalDate['value']): GenealogicalDate => ({ qualifier: 'between', value, until });

describe('dates in Russian', () => {
  it.each<[GenealogicalDate, string]>([
    [exact(1850), '1850'],
    [exact(1801, 3, 11), '11 марта 1801'],
    [exact(1801, 3), 'март 1801'],
    [{ ...exact(1850), qualifier: 'about' }, 'около 1850'],
    [{ ...exact(1801, 3, 11), qualifier: 'about' }, 'около 11 марта 1801'],
    [{ ...exact(1801, 3), qualifier: 'about' }, 'около марта 1801'],
    [{ ...exact(1850), qualifier: 'before' }, 'до 1850'],
    [{ ...exact(1850), qualifier: 'after' }, 'после 1850'],
    [{ ...exact(1850), qualifier: 'calculated' }, '1850 (по расчёту)'],
    [{ ...exact(1850), qualifier: 'estimated' }, '1850 (по оценке)'],
    [between({ year: 1850, month: null, day: null }, { year: 1860, month: null, day: null }), 'между 1850 и 1860'],
    [between({ year: 1801, month: 3, day: 11 }, { year: 1801, month: 3, day: 12 }), 'между 11 марта 1801 и 12 марта 1801'],
    [between({ year: 1801, month: 3, day: null }, { year: 1801, month: 4, day: null }), 'между мартом 1801 и апрелем 1801'],
  ])('writes %o as %s', (date, expected) => {
    expect(formatGenealogicalDate(RUSSIAN, date)).toBe(expected);
  });
});

describe('short dates and month names in Russian', () => {
  it('shortens years and life spans', () => {
    expect([formatYear(RUSSIAN, { ...exact(1850), qualifier: 'about' }), formatYear(RUSSIAN, { ...exact(1850), qualifier: 'before' }), formatYear(RUSSIAN, { ...exact(1850), qualifier: 'after' })]).toEqual(['ок. 1850', 'до 1850', 'после 1850']);
    expect(formatLifeYears(RUSSIAN, { birth_date: exact(1809), death_date: exact(1882), is_deceased: true })).toBe('1809–1882');
    expect(formatLifeYears(RUSSIAN, { birth_date: { ...exact(1809), qualifier: 'about' }, death_date: null, is_deceased: false })).toBe('род. ок. 1809');
  });

  it('names the months of the date field the way a list starts, with a capital letter', () => {
    expect(monthOptionLabels(RUSSIAN).slice(0, 3)).toEqual(['Январь', 'Февраль', 'Март']);
  });

  it('keeps the genitive month names in the catalogue the same as the browser writes them after a day', () => {
    const afterDay = Array.from({ length: 12 }, (_, index) =>
      new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' }).formatToParts(new Date(Date.UTC(2001, index, 15))).find((part) => part.type === 'month')?.value,
    );
    expect(Object.values(ru.dates.monthsGenitive)).toEqual(afterDay);
  });
});

describe('dates in Serbian', () => {
  it.each<[GenealogicalDate, string]>([
    [exact(1850), '1850.'],
    [exact(1801, 3, 11), '11. март 1801.'],
    [exact(1801, 3), 'март 1801.'],
    [{ ...exact(1850), qualifier: 'about' }, 'око 1850.'],
    [{ ...exact(1801, 3, 11), qualifier: 'about' }, 'око 11. марта 1801.'],
    [{ ...exact(1850), qualifier: 'before' }, 'пре 1850.'],
    [{ ...exact(1801, 3), qualifier: 'before' }, 'пре марта 1801.'],
    [{ ...exact(1850), qualifier: 'after' }, 'после 1850.'],
    [{ ...exact(1850), qualifier: 'calculated' }, '1850. (прорачунато)'],
    [{ ...exact(1850), qualifier: 'estimated' }, '1850. (процењено)'],
    [between({ year: 1850, month: null, day: null }, { year: 1860, month: null, day: null }), 'између 1850. и 1860.'],
    [between({ year: 1801, month: 3, day: 11 }, { year: 1801, month: 3, day: 12 }), 'између 11. марта 1801. и 12. марта 1801.'],
  ])('writes %o as %s', (date, expected) => {
    expect(formatGenealogicalDate(SERBIAN, date)).toBe(expected);
  });

  it('shortens years and life spans without the ordinal dot', () => {
    expect([formatYear(SERBIAN, { ...exact(1850), qualifier: 'about' }), formatYear(SERBIAN, { ...exact(1850), qualifier: 'before' })]).toEqual(['ок. 1850', 'пре 1850']);
    expect(formatLifeYears(SERBIAN, { birth_date: exact(1809), death_date: null, is_deceased: true })).toBe('1809–?');
    expect(formatLifeYears(SERBIAN, { birth_date: exact(1809), death_date: null, is_deceased: false })).toBe('рођ. 1809');
  });

  it('names the months of the date field in Cyrillic with a capital letter', () => {
    expect(monthOptionLabels(SERBIAN).slice(0, 3)).toEqual(['Јануар', 'Фебруар', 'Март']);
  });
});
