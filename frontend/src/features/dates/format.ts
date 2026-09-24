import type { CalendarDate, DateQualifier, GenealogicalDate, PersonSummary } from '../../api/types';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const QUALIFIER_WORDS: Record<Exclude<DateQualifier, 'between'>, string> = {
  exact: '',
  about: 'about ',
  calculated: 'calculated ',
  estimated: 'estimated ',
  before: 'before ',
  after: 'after ',
};

const YEAR_PREFIXES: Record<DateQualifier, string> = {
  exact: '',
  about: 'c. ',
  calculated: 'c. ',
  estimated: 'c. ',
  before: 'bef. ',
  after: 'aft. ',
  between: 'c. ',
};

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function formatCalendarDate(date: CalendarDate): string {
  const parts = [date.day, date.month === null ? null : monthName(date.month), date.year];
  return parts.filter((part) => part !== null).join(' ');
}

export function formatGenealogicalDate(date: GenealogicalDate): string {
  if (date.qualifier === 'between' && date.until !== null) {
    return `between ${formatCalendarDate(date.value)} and ${formatCalendarDate(date.until)}`;
  }
  const qualifier = date.qualifier === 'between' ? 'exact' : date.qualifier;
  return `${QUALIFIER_WORDS[qualifier]}${formatCalendarDate(date.value)}`;
}

export function formatYear(date: GenealogicalDate): string {
  return `${YEAR_PREFIXES[date.qualifier]}${String(date.value.year)}`;
}

export function formatLifeYears(person: Pick<PersonSummary, 'birth_date' | 'death_date' | 'is_deceased'>): string {
  const birth = person.birth_date === null ? '?' : formatYear(person.birth_date);
  if (person.death_date !== null) {
    return `${birth}–${formatYear(person.death_date)}`;
  }
  if (person.is_deceased) {
    return `${birth}–?`;
  }
  return person.birth_date === null ? '' : `b. ${birth}`;
}
