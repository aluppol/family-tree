import type { PartnershipEndReason, PartnershipKind, PartnershipTerms } from '../../api/types';
import { type DateDraft, EMPTY_DATE_DRAFT, draftFromDate, parseDateDraft } from '../dates/dateDraft';
import { formatGenealogicalDate } from '../dates/format';

export type EndReasonChoice = PartnershipEndReason | 'none';

export interface TermsDraft {
  kind: PartnershipKind;
  startDate: DateDraft;
  startPlace: string;
  endReason: EndReasonChoice;
  endDate: DateDraft;
}

export type TermsErrors = Partial<Record<'startDate' | 'endDate', string>>;

export type TermsParse = { terms: PartnershipTerms; errors: null } | { terms: null; errors: TermsErrors };

export const EMPTY_TERMS_DRAFT: TermsDraft = {
  kind: 'marriage',
  startDate: EMPTY_DATE_DRAFT,
  startPlace: '',
  endReason: 'none',
  endDate: EMPTY_DATE_DRAFT,
};

const END_REASON_WORDS: Record<PartnershipEndReason, string> = {
  divorce: 'Divorced',
  annulment: 'Annulled',
  separation: 'Separated',
};

export function draftFromTerms(terms: PartnershipTerms): TermsDraft {
  return {
    kind: terms.kind,
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
      kind: draft.kind,
      start: { date: startDate.date, place: draft.startPlace.trim() },
      end: draft.endReason === 'none' ? null : { reason: draft.endReason, date: endDate.date },
    },
    errors: null,
  };
}

export function describeTerms(terms: PartnershipTerms): string | undefined {
  const startParts = [terms.start.date === null ? '' : formatGenealogicalDate(terms.start.date), terms.start.place].filter((part) => part !== '');
  const start = startParts.length === 0 ? '' : `${terms.kind === 'marriage' ? 'Married' : 'Together from'} ${startParts.join(', ')}`;
  const end = terms.end === null ? '' : [END_REASON_WORDS[terms.end.reason], terms.end.date === null ? '' : formatGenealogicalDate(terms.end.date)].filter((part) => part !== '').join(' ');
  const description = [start, end].filter((part) => part !== '').join(' · ');
  return description === '' ? undefined : description;
}
