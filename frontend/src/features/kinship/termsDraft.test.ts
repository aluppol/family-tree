import { expect, test } from 'vitest';
import type { PartnershipTerms } from '../../api/types';
import { exactDate } from '../../test/fixtures';
import { EMPTY_TERMS_DRAFT, type TermsDraft, describeTerms, draftFromTerms, termsFromDraft } from './termsDraft';

const ENDED_PARTNERSHIP: PartnershipTerms = {
  kind: 'partnership',
  start: { date: exactDate(1990), place: '' },
  end: { reason: 'separation', date: exactDate(2001, 3) },
};

test.each<[string, PartnershipTerms, string | undefined]>([
  ['a marriage with date and place', { kind: 'marriage', start: { date: exactDate(1839, 1, 29), place: 'Maer' }, end: null }, 'Married 29 Jan 1839, Maer'],
  ['a partnership that ended', ENDED_PARTNERSHIP, 'Together from 1990 · Separated Mar 2001'],
  ['a divorce without a known date', { kind: 'marriage', start: { date: null, place: '' }, end: { reason: 'divorce', date: null } }, 'Divorced'],
  ['an annulled marriage in a known place', { kind: 'marriage', start: { date: null, place: 'Paris' }, end: { reason: 'annulment', date: null } }, 'Married Paris · Annulled'],
  ['nothing known', { kind: 'marriage', start: { date: null, place: '' }, end: null }, undefined],
])('describes %s', (_description, terms, expected) => {
  expect(describeTerms(terms)).toBe(expected);
});

test('stored terms survive a round trip through the editable draft', () => {
  expect(termsFromDraft(draftFromTerms(ENDED_PARTNERSHIP))).toEqual({ terms: ENDED_PARTNERSHIP, errors: null });
});

test('an empty draft is a marriage with an unknown start and no end', () => {
  expect(termsFromDraft(EMPTY_TERMS_DRAFT)).toEqual({ terms: { kind: 'marriage', start: { date: null, place: '' }, end: null }, errors: null });
});

test('invalid start and end dates are both reported', () => {
  const draft: TermsDraft = {
    ...EMPTY_TERMS_DRAFT,
    startDate: { ...EMPTY_TERMS_DRAFT.startDate, value: { day: '', month: '', year: '0' } },
    endReason: 'divorce',
    endDate: { ...EMPTY_TERMS_DRAFT.endDate, value: { day: '31', month: '2', year: '1850' } },
  };
  expect(termsFromDraft(draft)).toEqual({
    terms: null,
    errors: { startDate: 'Year must be a whole number from 1 to 9999.', endDate: 'Day must be from 1 to 28 for this month.' },
  });
});
