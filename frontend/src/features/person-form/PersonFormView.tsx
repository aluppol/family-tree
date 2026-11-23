import type { ReactElement, SubmitEvent } from 'react';
import {
  Button,
  ButtonLink,
  CardSection,
  CheckboxField,
  InlineError,
  PageContainer,
  PageHeader,
  SelectField,
  TextArea,
  TextField,
} from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { optionalMessageText } from '../../i18n/message';
import { GenealogicalDateField } from '../dates/GenealogicalDateField';
import styles from './PersonForm.module.scss';
import type { PersonDraft, PersonFormErrors } from './personDraft';
import { sexOptions } from './sexOptions';
import type { DraftFieldChange } from './usePersonForm';

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
  const t = useT();
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
            {isSubmitting ? t('common.saving') : submitLabel}
          </Button>
          <ButtonLink to={cancelPath}>{t('common.cancel')}</ButtonLink>
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
  const t = useT();
  return (
    <CardSection title={t('personForm.nameSection')}>
      <div className={styles.columns}>
        <TextField label={t('personForm.givenNames')} autoComplete="off" value={draft.givenNames} error={optionalMessageText(t, errors.givenNames)} onChange={(event) => { onFieldChange('givenNames', event.target.value); }} />
        <TextField label={t('personForm.surname')} autoComplete="off" value={draft.surname} error={optionalMessageText(t, errors.surname)} onChange={(event) => { onFieldChange('surname', event.target.value); }} />
      </div>
      <SelectField className={styles.sex} label={t('personForm.sex')} options={sexOptions(t)} value={draft.sex} error={optionalMessageText(t, errors.sex)} onValueChange={(sex) => { onFieldChange('sex', sex); }} />
    </CardSection>
  );
}

function BirthSection({ draft, errors, onFieldChange }: SectionProps): ReactElement {
  const t = useT();
  return (
    <CardSection title={t('personForm.birthSection')}>
      <GenealogicalDateField legend={t('personForm.birthDate')} draft={draft.birthDate} error={optionalMessageText(t, errors.birthDate)} onDraftChange={(birthDate) => { onFieldChange('birthDate', birthDate); }} />
      <TextField label={t('personForm.birthPlace')} isOptional autoComplete="off" value={draft.birthPlace} error={optionalMessageText(t, errors.birthPlace)} onChange={(event) => { onFieldChange('birthPlace', event.target.value); }} />
    </CardSection>
  );
}

function DeathSection({ draft, errors, onFieldChange }: SectionProps): ReactElement {
  const t = useT();
  return (
    <CardSection title={t('personForm.deathSection')}>
      <CheckboxField label={t('personForm.hasDied')} checked={draft.hasDied} onChange={(event) => { onFieldChange('hasDied', event.target.checked); }} />
      {draft.hasDied && (
        <>
          <GenealogicalDateField legend={t('personForm.deathDate')} draft={draft.deathDate} error={optionalMessageText(t, errors.deathDate)} onDraftChange={(deathDate) => { onFieldChange('deathDate', deathDate); }} />
          <TextField label={t('personForm.deathPlace')} isOptional autoComplete="off" value={draft.deathPlace} error={optionalMessageText(t, errors.deathPlace)} onChange={(event) => { onFieldChange('deathPlace', event.target.value); }} />
        </>
      )}
    </CardSection>
  );
}

function BiographySection({ draft, errors, onFieldChange }: SectionProps): ReactElement {
  const t = useT();
  return (
    <CardSection title={t('personForm.biographySection')}>
      <TextArea label={t('personForm.lifeStory')} isOptional hint={t('personForm.lifeStoryHint')} rows={8} value={draft.biography} error={optionalMessageText(t, errors.biography)} onChange={(event) => { onFieldChange('biography', event.target.value); }} />
    </CardSection>
  );
}
