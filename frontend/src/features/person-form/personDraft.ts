import { ApiError } from '../../api/client';
import type { PersonProfile, Sex } from '../../api/types';
import { type DateDraft, type DateParse, EMPTY_DATE_DRAFT, draftFromDate, parseDateDraft } from '../dates/dateDraft';

export interface PersonDraft {
  givenNames: string;
  surname: string;
  sex: Sex;
  birthDate: DateDraft;
  birthPlace: string;
  hasDied: boolean;
  deathDate: DateDraft;
  deathPlace: string;
  biography: string;
}

export type PersonDraftField = keyof PersonDraft;

export type PersonFormErrors = Partial<Record<PersonDraftField, string>>;

export type ProfileParse = { profile: PersonProfile; errors: null } | { profile: null; errors: PersonFormErrors };

export const EMPTY_PERSON_DRAFT: PersonDraft = {
  givenNames: '',
  surname: '',
  sex: 'unknown',
  birthDate: EMPTY_DATE_DRAFT,
  birthPlace: '',
  hasDied: false,
  deathDate: EMPTY_DATE_DRAFT,
  deathPlace: '',
  biography: '',
};

const SERVER_FIELD_PATHS: readonly (readonly [string, PersonDraftField])[] = [
  ['given_names', 'givenNames'],
  ['surname', 'surname'],
  ['sex', 'sex'],
  ['birth.place', 'birthPlace'],
  ['birth', 'birthDate'],
  ['death.place', 'deathPlace'],
  ['death', 'deathDate'],
  ['biography', 'biography'],
];

const NO_DATE: DateParse = { date: null, problem: null };

export function draftFromProfile(profile: PersonProfile): PersonDraft {
  return {
    givenNames: profile.given_names,
    surname: profile.surname,
    sex: profile.sex,
    birthDate: draftFromDate(profile.birth.date),
    birthPlace: profile.birth.place,
    hasDied: profile.death !== null,
    deathDate: draftFromDate(profile.death?.date ?? null),
    deathPlace: profile.death?.place ?? '',
    biography: profile.biography,
  };
}

export function profileFromDraft(draft: PersonDraft): ProfileParse {
  const birthDate = parseDateDraft(draft.birthDate);
  const deathDate = draft.hasDied ? parseDateDraft(draft.deathDate) : NO_DATE;
  const errors: PersonFormErrors = {
    ...(isNameMissing(draft) ? { givenNames: 'Enter a given name or a surname.' } : {}),
    ...(birthDate.problem === null ? {} : { birthDate: birthDate.problem.message }),
    ...(deathDate.problem === null ? {} : { deathDate: deathDate.problem.message }),
  };
  if (Object.keys(errors).length > 0) {
    return { profile: null, errors };
  }
  return { profile: profileOf(draft, birthDate, deathDate), errors: null };
}

export function serverFieldErrors(error: unknown): PersonFormErrors {
  if (!(error instanceof ApiError)) {
    return {};
  }
  let errors: PersonFormErrors = {};
  for (const [path, messages] of Object.entries(error.fields)) {
    const field = draftFieldForServerPath(path);
    if (field !== null) {
      errors = { ...errors, [field]: [errors[field], ...messages].filter((message) => message !== undefined).join(' ') };
    }
  }
  return errors;
}

function profileOf(draft: PersonDraft, birthDate: DateParse, deathDate: DateParse): PersonProfile {
  return {
    given_names: draft.givenNames.trim(),
    surname: draft.surname.trim(),
    sex: draft.sex,
    birth: { date: birthDate.date, place: draft.birthPlace.trim() },
    death: draft.hasDied ? { date: deathDate.date, place: draft.deathPlace.trim() } : null,
    biography: draft.biography.trim(),
  };
}

function isNameMissing(draft: PersonDraft): boolean {
  return draft.givenNames.trim() === '' && draft.surname.trim() === '';
}

function draftFieldForServerPath(path: string): PersonDraftField | null {
  const match = SERVER_FIELD_PATHS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}.`));
  return match === undefined ? null : match[1];
}
