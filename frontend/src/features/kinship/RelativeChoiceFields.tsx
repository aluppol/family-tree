import type { ReactElement } from 'react';
import { Button, Icon, SearchCombobox, SelectField, TextField } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { optionalMessageText } from '../../i18n/message';
import { sexOptions } from '../person-form/sexOptions';
import styles from './Kinship.module.scss';
import type { NewRelativeForm, RelativeChoice } from './useRelativeChoice';

export interface RelativeChoiceFieldsProps {
  choice: RelativeChoice;
  label: string;
  choiceMissingText: string;
}

export function RelativeChoiceFields({ choice, label, choiceMissingText }: RelativeChoiceFieldsProps): ReactElement {
  const t = useT();
  const { picker, newRelative } = choice;
  if (newRelative !== null) {
    return <NewRelativeFields form={newRelative} onBackToSearch={choice.onBackToSearch} />;
  }
  return (
    <div ref={choice.hasLeftSearch ? focusFirstInput : undefined}>
      <SearchCombobox
        label={label}
        placeholder={t('kinship.searchPlaceholder')}
        emptyMessage={t('kinship.noOneMatches')}
        error={choice.isChoiceMissing ? choiceMissingText : undefined}
        query={picker.query}
        onQueryChange={picker.onQueryChange}
        options={picker.options}
        onSelect={picker.onSelect}
        isLoading={picker.isLoading}
      />
    </div>
  );
}

interface NewRelativeFieldsProps {
  form: NewRelativeForm;
  onBackToSearch: () => void;
}

function NewRelativeFields({ form, onBackToSearch }: NewRelativeFieldsProps): ReactElement {
  const t = useT();
  const { draft, errors, onFieldChange } = form;
  return (
    <div ref={focusFirstInput} className={styles.newRelative}>
      <Button size="small" variant="ghost" className={styles.backToSearch} onClick={onBackToSearch}>
        <Icon name="chevronLeft" />
        {t('kinship.backToSearch')}
      </Button>
      <TextField label={t('personForm.givenNames')} autoComplete="off" value={draft.givenNames} error={optionalMessageText(t, errors.givenNames)} onChange={(event) => { onFieldChange('givenNames', event.target.value); }} />
      <TextField label={t('personForm.surname')} autoComplete="off" value={draft.surname} onChange={(event) => { onFieldChange('surname', event.target.value); }} />
      <SelectField label={t('personForm.sex')} options={sexOptions(t)} value={draft.sex} onValueChange={(sex) => { onFieldChange('sex', sex); }} />
    </div>
  );
}

function focusFirstInput(container: HTMLElement | null): void {
  container?.querySelector('input')?.focus();
}
