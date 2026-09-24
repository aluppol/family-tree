import { expect, test } from 'vitest';
import { ApiError } from '../../api/client';
import type { PersonProfile } from '../../api/types';
import { exactDate } from '../../test/fixtures';
import { EMPTY_PERSON_DRAFT, draftFromProfile, profileFromDraft, serverFieldErrors } from './personDraft';

const EMMA: PersonProfile = {
  given_names: 'Emma',
  surname: 'Wedgwood',
  sex: 'female',
  birth: { date: exactDate(1808, 5, 2), place: 'Maer Hall' },
  death: { date: null, place: 'Downe' },
  biography: 'Pianist.',
};

function validationError(fields: Record<string, string[]>): ApiError {
  return new ApiError(400, { code: 'validation.invalid', message: 'Check the highlighted fields.', fields });
}

test('a stored profile survives a round trip through the form draft', () => {
  expect(profileFromDraft(draftFromProfile(EMMA))).toEqual({ profile: EMMA, errors: null });
});

test('names, places and the biography are trimmed', () => {
  const draft = { ...EMPTY_PERSON_DRAFT, givenNames: '  Emma ', surname: ' Wedgwood ', birthPlace: ' Maer ', biography: '\nPianist.\n' };
  expect(profileFromDraft(draft).profile).toMatchObject({ given_names: 'Emma', surname: 'Wedgwood', birth: { place: 'Maer' }, biography: 'Pianist.' });
});

test('a surname alone is enough and the death is left out until the person has died', () => {
  const draft = { ...EMPTY_PERSON_DRAFT, surname: 'Darwin', deathPlace: 'Downe' };
  expect(profileFromDraft(draft).profile).toMatchObject({ given_names: '', surname: 'Darwin', death: null });
});

test('every client-side problem is reported at once', () => {
  const draft = {
    ...EMPTY_PERSON_DRAFT,
    birthDate: { ...EMPTY_PERSON_DRAFT.birthDate, value: { day: '12', month: '', year: '1809' } },
    hasDied: true,
    deathDate: { ...EMPTY_PERSON_DRAFT.deathDate, value: { day: '', month: '', year: '99999' } },
  };
  expect(profileFromDraft(draft)).toEqual({
    profile: null,
    errors: {
      givenNames: 'Enter a given name or a surname.',
      birthDate: 'Choose a month for this day.',
      deathDate: 'Year must be a whole number from 1 to 9999.',
    },
  });
});

test('server field paths map onto the form fields and repeated messages are joined', () => {
  const error = validationError({
    'birth.date.value.year': ['Year 12000 is outside 1–9999.'],
    'birth.date.until': ['The second date is before the first.'],
    'death.place': ['Too long.'],
    death: ['A person cannot die before being born.'],
    given_names: ['Too long.'],
    unknown_field: ['Ignored.'],
  });
  expect(serverFieldErrors(error)).toEqual({
    birthDate: 'Year 12000 is outside 1–9999. The second date is before the first.',
    deathPlace: 'Too long.',
    deathDate: 'A person cannot die before being born.',
    givenNames: 'Too long.',
  });
});

test('errors that are not validation errors map to no fields', () => {
  expect(serverFieldErrors(new TypeError('Failed to fetch'))).toEqual({});
  expect(serverFieldErrors(null)).toEqual({});
});
