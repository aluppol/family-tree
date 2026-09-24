import { expect, test } from 'vitest';
import type { DateQualifier, GenealogicalDate } from '../../api/types';
import { type CalendarDraft, type DateDraft, type DateProblem, EMPTY_DATE_DRAFT, draftFromDate, parseDateDraft } from './dateDraft';

function calendar(day: string, month: string, year: string): CalendarDraft {
  return { day, month, year };
}

function draftOf(qualifier: DateQualifier, value: CalendarDraft, until: CalendarDraft = calendar('', '', '')): DateDraft {
  return { qualifier, value, until };
}

function problem(inputName: DateProblem['inputName'], message: string): { date: null; problem: DateProblem } {
  return { date: null, problem: { inputName, message } };
}

function dated(date: GenealogicalDate): { date: GenealogicalDate; problem: null } {
  return { date, problem: null };
}

const BLANK = calendar('', '', '');

test.each<[string, DateDraft, ReturnType<typeof parseDateDraft>]>([
  ['a blank date means no date', EMPTY_DATE_DRAFT, { date: null, problem: null }],
  ['a blank date with a qualifier still means no date', draftOf('about', BLANK), { date: null, problem: null }],
  ['a year alone', draftOf('exact', calendar('', '', '1809')), dated({ qualifier: 'exact', value: { year: 1809, month: null, day: null }, until: null })],
  ['a qualified month and year', draftOf('about', calendar('', '2', '1809')), dated({ qualifier: 'about', value: { year: 1809, month: 2, day: null }, until: null })],
  ['a full date with spaces', draftOf('exact', calendar(' 12 ', '2', ' 1809 ')), dated({ qualifier: 'exact', value: { year: 1809, month: 2, day: 12 }, until: null })],
  ['a day needs a month', draftOf('exact', calendar('12', '', '1809')), problem('value.month', 'Choose a month for this day.')],
  ['the day must exist in that month', draftOf('exact', calendar('30', '2', '1809')), problem('value.day', 'Day must be from 1 to 28 for this month.')],
  ['29 February exists in a leap year', draftOf('exact', calendar('29', '2', '1804')), dated({ qualifier: 'exact', value: { year: 1804, month: 2, day: 29 }, until: null })],
  ['a century is not a leap year', draftOf('exact', calendar('29', '2', '1900')), problem('value.day', 'Day must be from 1 to 28 for this month.')],
  ['every fourth century is a leap year', draftOf('exact', calendar('29', '2', '2000')), dated({ qualifier: 'exact', value: { year: 2000, month: 2, day: 29 }, until: null })],
  ['day zero does not exist', draftOf('exact', calendar('0', '1', '1809')), problem('value.day', 'Day must be from 1 to 31 for this month.')],
  ['a day must be a number', draftOf('exact', calendar('x', '1', '1809')), problem('value.day', 'Day must be a whole number.')],
  ['a month without a year', draftOf('exact', calendar('', '3', '')), problem('value.year', 'Enter a year.')],
  ['year zero is out of range', draftOf('exact', calendar('', '', '0')), problem('value.year', 'Year must be a whole number from 1 to 9999.')],
  ['year 10000 is out of range', draftOf('exact', calendar('', '', '10000')), problem('value.year', 'Year must be a whole number from 1 to 9999.')],
  ['a year must be a number', draftOf('exact', calendar('', '', '18o9')), problem('value.year', 'Year must be a whole number from 1 to 9999.')],
  ['a range of years', draftOf('between', calendar('', '', '1760'), calendar('', '5', '1762')), dated({ qualifier: 'between', value: { year: 1760, month: null, day: null }, until: { year: 1762, month: 5, day: null } })],
  ['a range needs a second date', draftOf('between', calendar('', '', '1760')), problem('until.year', 'Enter a year for the second date.')],
  ['a range needs a first date', draftOf('between', BLANK, calendar('', '', '1762')), problem('value.year', 'Enter a year.')],
  ['a range may not end before it starts', draftOf('between', calendar('', '', '1762'), calendar('', '', '1760')), problem('until.year', 'The second date must not be before the first.')],
  ['a range may not end on an earlier day', draftOf('between', calendar('5', '5', '1760'), calendar('4', '5', '1760')), problem('until.year', 'The second date must not be before the first.')],
  ['ranges compare only the precision both dates have', draftOf('between', calendar('', '5', '1760'), calendar('', '', '1760')), dated({ qualifier: 'between', value: { year: 1760, month: 5, day: null }, until: { year: 1760, month: null, day: null } })],
  ['the second date is ignored outside a range', draftOf('before', calendar('', '', '1790'), calendar('', '', '1700')), dated({ qualifier: 'before', value: { year: 1790, month: null, day: null }, until: null })],
])('%s', (_description, draft, expected) => {
  expect(parseDateDraft(draft)).toEqual(expected);
});

test('a stored date becomes an editable draft and back', () => {
  const stored: GenealogicalDate = { qualifier: 'between', value: { year: 1760, month: null, day: null }, until: { year: 1762, month: 5, day: 3 } };
  const draft = draftFromDate(stored);
  expect(draft).toEqual({ qualifier: 'between', value: calendar('', '', '1760'), until: calendar('3', '5', '1762') });
  expect(parseDateDraft(draft)).toEqual(dated(stored));
});

test('no stored date becomes an empty draft', () => {
  expect(draftFromDate(null)).toEqual(EMPTY_DATE_DRAFT);
  expect(draftFromDate({ qualifier: 'after', value: { year: 1790, month: 3, day: null }, until: null }).until).toEqual(BLANK);
});
