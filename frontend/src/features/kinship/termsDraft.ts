import type { PartnershipEndReason, PartnershipTerms } from '../../api/types';
import type { Message } from '../../i18n/message';
import type { Translate } from '../../i18n/translate';
import { type DateDraft, EMPTY_DATE_DRAFT, draftFromDate, parseDateDraft } from '../dates/dateDraft';
import { formatGenealogicalDate } from '../dates/format';

export type EndReasonChoice = PartnershipEndReason | 'none';

export interface TermsDraft {
  startDate: DateDraft;
  startPlace: string;
  endReason: EndReasonChoice;
  endDate: DateDraft;
}

export type TermsErrors = Partial<Record<'startDate' | 'endDate', Message>>;

export type TermsParse = { terms: PartnershipTerms; errors: null } | { terms: null; errors: TermsErrors };

export const EMPTY_TERMS_DRAFT: TermsDraft = {
  startDate: EMPTY_DATE_DRAFT,
  startPlace: '',
  endReason: 'none',
  endDate: EMPTY_DATE_DRAFT,
};

const END_REASON_WORDS: Record<PartnershipEndReason, 'divorced' | 'annulled' | 'separated'> = {
  divorce: 'divorced',
  annulment: 'annulled',
  separation: 'separated',
};

export function draftFromTerms(terms: PartnershipTerms): TermsDraft {
  return {
    startDate: draftFromDate(terms.start.date),
    startPlace: terms.start.place,
    endReason: terms.end?.reason ?? 'none',
    endDate: draftFromDate(terms.end?.date ?? null),
  };
}

export function termsFromDraft(draft: TermsDraft): TermsParse {
  const startDate = parseDateDraft(draft.startDate);
  const endDate = draft.endReason === 'none' ? { date: null, problem: null } : parseDateDraft(draft.endDate);
  if (startDate.problem !== null || endDate.problem !== null) {
    return { terms: null, errors: { startDate: startDate.problem?.message, endDate: endDate.problem?.message } };
  }
  return {
    terms: {
      kind: 'marriage',
      start: { date: startDate.date, place: draft.startPlace.trim() },
      end: draft.endReason === 'none' ? null : { reason: draft.endReason, date: endDate.date },
    },
    errors: null,
  };
}

export function describeTerms(t: Translate, terms: PartnershipTerms): string | undefined {
  const startParts = [terms.start.date === null ? '' : formatGenealogicalDate(t, terms.start.date), terms.start.place].filter((part) => part !== '');
  const start = startParts.length === 0 ? '' : t('kinship.terms.married', { details: startParts.join(', ') });
  const end = terms.end === null ? '' : [t(`kinship.terms.${END_REASON_WORDS[terms.end.reason]}`), terms.end.date === null ? '' : formatGenealogicalDate(t, terms.end.date)].filter((part) => part !== '').join(' ');
  const description = [start, end].filter((part) => part !== '').join(' · ');
  return description === '' ? undefined : description;
}
