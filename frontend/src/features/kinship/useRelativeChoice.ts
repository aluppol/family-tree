import { useState } from 'react';
import type { PersonProfile, PersonSummary } from '../../api/types';
import { EMPTY_PERSON_DRAFT, type PersonDraft, type PersonFormErrors, profileFromDraft } from '../person-form/personDraft';
import type { DraftFieldChange } from '../person-form/usePersonForm';
import type { CandidateSource } from './kinshipQueries';
import { type CandidatePicker, useCandidatePicker } from './useCandidatePicker';

export interface NewRelativeForm {
  draft: PersonDraft;
  errors: PersonFormErrors;
  onFieldChange: DraftFieldChange;
}

export interface RelativeChoiceHandlers {
  onExistingPerson: (person: PersonSummary) => void;
  onNewPerson: (profile: PersonProfile) => void;
}

export interface RelativeChoice {
  picker: CandidatePicker;
  newRelative: NewRelativeForm | null;
  hasLeftSearch: boolean;
  isChoiceMissing: boolean;
  onBackToSearch: () => void;
  submit: (handlers: RelativeChoiceHandlers) => void;
}

interface SubmitContext {
  picker: CandidatePicker;
  draft: PersonDraft | null;
  openNewRelative: (typedName: string) => void;
  showErrors: (errors: PersonFormErrors) => void;
  markChoiceMissing: () => void;
}

export function useRelativeChoice(source: CandidateSource, personId: number, oneWordSurname: string): RelativeChoice {
  const [draft, setDraft] = useState<PersonDraft | null>(null);
  const [errors, setErrors] = useState<PersonFormErrors>({});
  const [hasLeftSearch, setHasLeftSearch] = useState(false);
  const [hasTriedWithoutChoice, setHasTriedWithoutChoice] = useState(false);
  function openNewRelative(typedName: string): void {
    setDraft(draftFromTypedName(typedName, oneWordSurname));
    setErrors({});
    setHasLeftSearch(true);
  }
  const picker = useCandidatePicker(source, personId, openNewRelative);
  function changeDraft(changed: PersonDraft): void {
    setDraft(changed);
    setErrors({});
  }
  const context: SubmitContext = { picker, draft, openNewRelative, showErrors: setErrors, markChoiceMissing: () => { setHasTriedWithoutChoice(true); } };
  return {
    picker,
    newRelative: draft === null ? null : newRelativeForm(draft, errors, changeDraft),
    hasLeftSearch,
    isChoiceMissing: hasTriedWithoutChoice && picker.query.trim() === '',
    onBackToSearch: () => { setDraft(null); },
    submit: (handlers) => { submitChoice(context, handlers); },
  };
}

function draftFromTypedName(typedName: string, oneWordSurname: string): PersonDraft {
  const words = typedName.trim().split(/\s+/);
  const typedSurname = words.length > 1 ? words.pop() : undefined;
  return { ...EMPTY_PERSON_DRAFT, givenNames: words.join(' '), surname: typedSurname ?? oneWordSurname };
}

function newRelativeForm(draft: PersonDraft, errors: PersonFormErrors, changeDraft: (draft: PersonDraft) => void): NewRelativeForm {
  const onFieldChange: DraftFieldChange = (field, value) => {
    changeDraft({ ...draft, [field]: value });
  };
  return { draft, errors, onFieldChange };
}

function submitChoice(context: SubmitContext, handlers: RelativeChoiceHandlers): void {
  const { picker, draft } = context;
  if (draft !== null) {
    submitNewRelative(context, draft, handlers);
  } else if (picker.selectedPerson !== null) {
    handlers.onExistingPerson(picker.selectedPerson);
  } else if (picker.query.trim() === '') {
    context.markChoiceMissing();
  } else {
    context.openNewRelative(picker.query);
  }
}

function submitNewRelative(context: SubmitContext, draft: PersonDraft, handlers: RelativeChoiceHandlers): void {
  const parsed = profileFromDraft(draft);
  context.showErrors(parsed.errors ?? {});
  if (parsed.profile !== null) {
    handlers.onNewPerson(parsed.profile);
  }
}
