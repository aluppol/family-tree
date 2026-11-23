import type { CalendarDate, GenealogicalDate, PersonSummary } from '../../api/types';
import { type Language, type MonthStyle, localeOf, monthStyleOf } from '../../i18n/languages';
import type { Translate } from '../../i18n/translate';

type GrammaticalCase = 'plain' | 'genitive' | 'instrumental';

type DateVariants = Record<string, string>;

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

const monthFormatters = new Map<string, Intl.DateTimeFormat>();

export function monthName(t: Translate, month: number): string {
  return isMonth(month) ? monthFormatter(t.language, monthStyleOf(t.language)).format(firstDayOf(month)) : String(month);
}

export function monthOptionLabels(t: Translate): string[] {
  const locale = localeOf(t.language);
  return MONTH_KEYS.map((_, index) => {
    const name = monthFormatter(t.language, 'long').format(firstDayOf(index + 1));
    return `${name.charAt(0).toLocaleUpperCase(locale)}${name.slice(1)}`;
  });
}

export function formatCalendarDate(t: Translate, date: CalendarDate): string {
  return calendarText(t, date, 'plain');
}

export function formatGenealogicalDate(t: Translate, date: GenealogicalDate): string {
  if (date.qualifier === 'between' && date.until !== null) {
    return t('dates.phrases.between', { ...variantsOf(t, 'from', date.value), ...variantsOf(t, 'to', date.until) });
  }
  if (date.qualifier === 'exact' || date.qualifier === 'between') {
    return calendarText(t, date.value, 'plain');
  }
  return t(`dates.phrases.${date.qualifier}`, variantsOf(t, 'date', date.value));
}

export function formatYear(t: Translate, date: GenealogicalDate): string {
  const year = String(date.value.year);
  return date.qualifier === 'exact' ? year : t(`dates.short.${date.qualifier}`, { year });
}

export function formatLifeYears(t: Translate, person: Pick<PersonSummary, 'birth_date' | 'death_date' | 'is_deceased'>): string {
  const unknownYear = t('dates.lifeYears.unknownYear');
  const birth = person.birth_date === null ? unknownYear : formatYear(t, person.birth_date);
  if (person.death_date !== null) {
    return t('dates.lifeYears.span', { birth, death: formatYear(t, person.death_date) });
  }
  if (person.is_deceased) {
    return t('dates.lifeYears.span', { birth, death: unknownYear });
  }
  return person.birth_date === null ? '' : t('dates.lifeYears.born', { year: birth });
}

function variantsOf(t: Translate, name: string, date: CalendarDate): DateVariants {
  return {
    [name]: calendarText(t, date, 'plain'),
    [`${name}Genitive`]: calendarText(t, date, 'genitive'),
    [`${name}Instrumental`]: calendarText(t, date, 'instrumental'),
  };
}

function calendarText(t: Translate, date: CalendarDate, grammaticalCase: GrammaticalCase): string {
  const year = String(date.year);
  if (date.month === null) {
    return t('dates.calendar.year', { year });
  }
  const month = monthIn(t, date.month, grammaticalCase);
  if (date.day === null) {
    return t('dates.calendar.monthYear', { month, year });
  }
  return t('dates.calendar.dayMonthYear', { day: String(date.day), month, monthGenitive: monthIn(t, date.month, 'genitive'), year });
}

function monthIn(t: Translate, month: number, grammaticalCase: GrammaticalCase): string {
  const monthKey = MONTH_KEYS[month - 1];
  if (grammaticalCase === 'plain' || monthKey === undefined) {
    return monthName(t, month);
  }
  return grammaticalCase === 'genitive' ? t(`dates.monthsGenitive.${monthKey}`) : t(`dates.monthsInstrumental.${monthKey}`);
}

function monthFormatter(language: Language, style: MonthStyle): Intl.DateTimeFormat {
  const cacheKey = `${language}-${style}`;
  const cached = monthFormatters.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(localeOf(language), { month: style, timeZone: 'UTC' });
  monthFormatters.set(cacheKey, formatter);
  return formatter;
}

function isMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= MONTH_KEYS.length;
}

function firstDayOf(month: number): Date {
  return new Date(Date.UTC(2001, month - 1, 1));
}
