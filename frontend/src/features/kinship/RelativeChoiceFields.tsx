import type { ReactElement } from 'react';
import { Button, Icon, SearchCombobox, SelectField, TextField } from '../../design/components';
import { SEX_OPTIONS } from '../person-form/sexOptions';
import styles from './Kinship.module.scss';
import type { NewRelativeForm, RelativeChoice } from './useRelativeChoice';

export interface RelativeChoiceFieldsProps {
  choice: RelativeChoice;
  label: string;
  relativeNoun: string;
}

export function RelativeChoiceFields({ choice, label, relativeNoun }: RelativeChoiceFieldsProps): ReactElement {
  const { picker, newRelative } = choice;
  if (newRelative !== null) {
    return <NewRelativeFields form={newRelative} onBackToSearch={choice.onBackToSearch} />;
  }
  const error = choice.isChoiceMissing ? `Type a name or choose a ${relativeNoun} from the suggestions.` : undefined;
  return (
    <div ref={choice.hasLeftSearch ? focusFirstInput : undefined}>
      <SearchCombobox
        label={label}
        placeholder="Search by name"
        emptyMessage="No one matches"
        error={error}
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
  const { draft, errors, onFieldChange } = form;
  return (
    <div ref={focusFirstInput} className={styles.newRelative}>
      <Button size="small" variant="ghost" className={styles.backToSearch} onClick={onBackToSearch}>
        <Icon name="chevronLeft" />
        Back to search
      </Button>
      <TextField label="Given names" autoComplete="off" value={draft.givenNames} error={errors.givenNames} onChange={(event) => { onFieldChange('givenNames', event.target.value); }} />
      <TextField label="Surname" autoComplete="off" value={draft.surname} onChange={(event) => { onFieldChange('surname', event.target.value); }} />
      <SelectField label="Sex" options={SEX_OPTIONS} value={draft.sex} onValueChange={(sex) => { onFieldChange('sex', sex); }} />
    </div>
  );
}

function focusFirstInput(container: HTMLElement | null): void {
  container?.querySelector('input')?.focus();
}
