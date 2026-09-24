import type { ReactElement, SubmitEvent } from 'react';
import type { Sex } from '../../api/types';
import {
  Button,
  ButtonLink,
  CardSection,
  CheckboxField,
  InlineError,
  PageContainer,
  PageHeader,
  SelectField,
  type SelectOption,
  TextArea,
  TextField,
} from '../../design/components';
import { GenealogicalDateField } from '../dates/GenealogicalDateField';
import styles from './PersonForm.module.scss';
import type { PersonDraft, PersonFormErrors } from './personDraft';
import type { DraftFieldChange } from './usePersonForm';

const SEX_OPTIONS: readonly SelectOption<Sex>[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];

export interface PersonFormViewProps {
  heading: string;
  submitLabel: string;
  cancelPath: string;
  isSubmitting: boolean;
  serverError: unknown;
  draft: PersonDraft;
  errors: PersonFormErrors;
  onFieldChange: DraftFieldChange;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}

export function PersonFormView(props: PersonFormViewProps): ReactElement {
  const { heading, submitLabel, cancelPath, isSubmitting, serverError, draft, errors, onFieldChange, onSubmit } = props;
  const sectionProps: SectionProps = { draft, errors, onFieldChange };
  return (
    <PageContainer width="narrow">
      <PageHeader title={heading} />
      <form className={styles.form} noValidate onSubmit={onSubmit} aria-busy={isSubmitting}>
        <InlineError error={serverError} />
        <NameSection {...sectionProps} />
        <BirthSection {...sectionProps} />
        <DeathSection {...sectionProps} />
        <BiographySection {...sectionProps} />
        <div className={styles.actions}>
          <Button type="submit" variant="primary" aria-disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
          <ButtonLink to={cancelPath}>Cancel</ButtonLink>
        </div>
      </form>
    </PageContainer>
  );
}

interface SectionProps {
  draft: PersonDraft;
  errors: PersonFormErrors;
  onFieldChange: DraftFieldChange;
}

function NameSection({ draft, errors, onFieldChange }: SectionProps): ReactElement {
  return (
    <CardSection title="Name">
      <div className={styles.columns}>
        <TextField label="Given names" autoComplete="off" value={draft.givenNames} error={errors.givenNames} onChange={(event) => { onFieldChange('givenNames', event.target.value); }} />
        <TextField label="Surname" autoComplete="off" value={draft.surname} error={errors.surname} onChange={(event) => { onFieldChange('surname', event.target.value); }} />
      </div>
      <SelectField className={styles.sex} label="Sex" options={SEX_OPTIONS} value={draft.sex} error={errors.sex} onValueChange={(sex) => { onFieldChange('sex', sex); }} />
    </CardSection>
  );
}

function BirthSection({ draft, errors, onFieldChange }: SectionProps): ReactElement {
  return (
    <CardSection title="Birth">
      <GenealogicalDateField legend="Date of birth" draft={draft.birthDate} error={errors.birthDate} onDraftChange={(birthDate) => { onFieldChange('birthDate', birthDate); }} />
      <TextField label="Place of birth" isOptional autoComplete="off" value={draft.birthPlace} error={errors.birthPlace} onChange={(event) => { onFieldChange('birthPlace', event.target.value); }} />
    </CardSection>
  );
}

function DeathSection({ draft, errors, onFieldChange }: SectionProps): ReactElement {
  return (
    <CardSection title="Death">
      <CheckboxField label="This person has died" checked={draft.hasDied} onChange={(event) => { onFieldChange('hasDied', event.target.checked); }} />
      {draft.hasDied && (
        <>
          <GenealogicalDateField legend="Date of death" draft={draft.deathDate} error={errors.deathDate} onDraftChange={(deathDate) => { onFieldChange('deathDate', deathDate); }} />
          <TextField label="Place of death" isOptional autoComplete="off" value={draft.deathPlace} error={errors.deathPlace} onChange={(event) => { onFieldChange('deathPlace', event.target.value); }} />
        </>
      )}
    </CardSection>
  );
}

function BiographySection({ draft, errors, onFieldChange }: SectionProps): ReactElement {
  return (
    <CardSection title="Biography">
      <TextArea label="Life story" isOptional hint="Plain text. Line breaks are kept." rows={8} value={draft.biography} error={errors.biography} onChange={(event) => { onFieldChange('biography', event.target.value); }} />
    </CardSection>
  );
}
