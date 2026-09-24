import { type SubmitEvent, useState } from 'react';
import { flushSync } from 'react-dom';
import type { PersonProfile } from '../../api/types';
import { type PersonDraft, type PersonDraftField, type PersonFormErrors, profileFromDraft, serverFieldErrors } from './personDraft';

export type DraftFieldChange = <Field extends PersonDraftField>(field: Field, value: PersonDraft[Field]) => void;

export interface PersonFormOptions {
  initialDraft: PersonDraft;
  serverError: unknown;
  onValidSubmit: (profile: PersonProfile) => void;
}

export interface PersonFormState {
  draft: PersonDraft;
  errors: PersonFormErrors;
  onFieldChange: DraftFieldChange;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}

export function usePersonForm({ initialDraft, serverError, onValidSubmit }: PersonFormOptions): PersonFormState {
  const [draft, setDraft] = useState(initialDraft);
  const [clientErrors, setClientErrors] = useState<PersonFormErrors>({});
  const [editedFields, setEditedFields] = useState<ReadonlySet<string>>(new Set());
  const handleFieldChange: DraftFieldChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setEditedFields((current) => new Set(current).add(field));
  };
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = profileFromDraft(draft);
    flushSync(() => {
      setClientErrors(parsed.errors ?? {});
      setEditedFields(new Set());
    });
    if (parsed.profile === null) {
      focusFirstInvalidControl(form);
    } else {
      onValidSubmit(parsed.profile);
    }
  }
  const errors = withoutEditedFields({ ...serverFieldErrors(serverError), ...clientErrors }, editedFields);
  return { draft, errors, onFieldChange: handleFieldChange, onSubmit: handleSubmit };
}

function withoutEditedFields(errors: PersonFormErrors, editedFields: ReadonlySet<string>): PersonFormErrors {
  return Object.fromEntries(Object.entries(errors).filter(([field]) => !editedFields.has(field)));
}

function focusFirstInvalidControl(form: HTMLFormElement): void {
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
