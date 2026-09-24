import type { CalendarDate, DateQualifier, GenealogicalDate } from '../../api/types';

export interface CalendarDraft {
  day: string;
  month: string;
  year: string;
}

export interface DateDraft {
  qualifier: DateQualifier;
  value: CalendarDraft;
  until: CalendarDraft;
}

export type CalendarPart = 'value' | 'until';

export type DateInputName = `${CalendarPart}.${keyof CalendarDraft}`;

export interface DateProblem {
  inputName: DateInputName;
  message: string;
}

export type DateParse = { date: GenealogicalDate | null; problem: null } | { date: null; problem: DateProblem };

const EMPTY_CALENDAR_DRAFT: CalendarDraft = { day: '', month: '', year: '' };

export const EMPTY_DATE_DRAFT: DateDraft = { qualifier: 'exact', value: EMPTY_CALENDAR_DRAFT, until: EMPTY_CALENDAR_DRAFT };

export function draftFromDate(date: GenealogicalDate | null): DateDraft {
  if (date === null) {
    return EMPTY_DATE_DRAFT;
  }
  return {
    qualifier: date.qualifier,
    value: calendarDraftOf(date.value),
    until: date.until === null ? EMPTY_CALENDAR_DRAFT : calendarDraftOf(date.until),
  };
}

export function parseDateDraft(draft: DateDraft): DateParse {
  const isRange = draft.qualifier === 'between';
  if (isBlank(draft.value) && (!isRange || isBlank(draft.until))) {
    return { date: null, problem: null };
  }
  const value = parseCalendarDraft(draft.value, 'value');
  if (value.problem !== null) {
    return value;
  }
  return isRange ? parseRange(value.date, draft.until) : { date: { qualifier: draft.qualifier, value: value.date, until: null }, problem: null };
}

type CalendarParse = { date: CalendarDate; problem: null } | { date: null; problem: DateProblem };

function parseRange(value: CalendarDate, untilDraft: CalendarDraft): DateParse {
  const until = parseCalendarDraft(untilDraft, 'until');
  if (until.problem !== null) {
    return until;
  }
  if (isEarlier(until.date, value)) {
    return problemAt('until.year', 'The second date must not be before the first.');
  }
  return { date: { qualifier: 'between', value, until: until.date }, problem: null };
}

function parseCalendarDraft(draft: CalendarDraft, part: CalendarPart): CalendarParse {
  const year = parseWholeNumber(draft.year);
  if (year === null || year < 1 || year > 9999) {
    return problemAt(`${part}.year`, draft.year.trim() === '' ? missingYearMessage(part) : 'Year must be a whole number from 1 to 9999.');
  }
  const month = draft.month === '' ? null : parseWholeNumber(draft.month);
  const day = draft.day.trim() === '' ? null : parseWholeNumber(draft.day);
  if (day === null && draft.day.trim() !== '') {
    return problemAt(`${part}.day`, 'Day must be a whole number.');
  }
  return checkDayFitsMonth({ year, month, day }, part);
}

function checkDayFitsMonth(date: CalendarDate, part: CalendarPart): CalendarParse {
  if (date.day === null) {
    return { date, problem: null };
  }
  if (date.month === null) {
    return problemAt(`${part}.month`, 'Choose a month for this day.');
  }
  const monthLength = daysInMonth(date.year, date.month);
  if (date.day < 1 || date.day > monthLength) {
    return problemAt(`${part}.day`, `Day must be from 1 to ${String(monthLength)} for this month.`);
  }
  return { date, problem: null };
}

function daysInMonth(year: number, month: number): number {
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const monthLengths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return monthLengths[month - 1] ?? 31;
}

function isEarlier(candidate: CalendarDate, reference: CalendarDate): boolean {
  const comparableParts: [number | null, number | null][] = [
    [candidate.year, reference.year],
    [candidate.month, reference.month],
    [candidate.day, reference.day],
  ];
  for (const [candidatePart, referencePart] of comparableParts) {
    if (candidatePart === null || referencePart === null) {
      return false;
    }
    if (candidatePart !== referencePart) {
      return candidatePart < referencePart;
    }
  }
  return false;
}

function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

function missingYearMessage(part: CalendarPart): string {
  return part === 'value' ? 'Enter a year.' : 'Enter a year for the second date.';
}

function problemAt(inputName: DateInputName, message: string): { date: null; problem: DateProblem } {
  return { date: null, problem: { inputName, message } };
}

function isBlank(draft: CalendarDraft): boolean {
  return draft.day.trim() === '' && draft.month === '' && draft.year.trim() === '';
}

function calendarDraftOf(date: CalendarDate): CalendarDraft {
  return {
    day: date.day === null ? '' : String(date.day),
    month: date.month === null ? '' : String(date.month),
    year: String(date.year),
  };
}
