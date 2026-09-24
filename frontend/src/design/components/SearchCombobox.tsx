import type { MouseEvent, ReactElement } from 'react';
import { type FieldDescription, FieldError, FieldHint, FieldLabel, type FieldTexts, useFieldDescription } from './fieldParts';
import { Icon } from './Icon';
import styles from './SearchCombobox.module.scss';
import { type ComboboxBehaviour, type ComboboxOption, useComboboxBehaviour } from './useComboboxBehaviour';

export type { ComboboxOption } from './useComboboxBehaviour';

export interface SearchComboboxProps<Option extends ComboboxOption> extends FieldTexts {
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
  options: readonly Option[];
  onSelect: (option: Option) => void;
  isLoading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

export function SearchCombobox<Option extends ComboboxOption>(props: SearchComboboxProps<Option>): ReactElement {
  const { label, options, isLoading = false, emptyMessage = 'No matches', hint, error } = props;
  const description = useFieldDescription(props);
  const listboxId = `${description.controlId}-listbox`;
  const behaviour = useComboboxBehaviour({ ...props, listboxId });
  const emptyText = isLoading ? 'Searching…' : emptyMessage;
  return (
    <div className={styles.combobox}>
      <FieldLabel htmlFor={description.controlId} label={label} />
      <FieldHint description={description} hint={hint} />
      <ComboboxInput {...props} description={description} listboxId={listboxId} behaviour={behaviour} />
      <ComboboxPopup listboxId={listboxId} label={label} options={options} behaviour={behaviour} emptyText={emptyText} />
      <FieldError description={description} error={error} />
      <span role="status" className="visually-hidden">
        {behaviour.isOpen ? announcement(options.length, emptyText) : ''}
      </span>
    </div>
  );
}

interface ComboboxInputProps<Option extends ComboboxOption> extends SearchComboboxProps<Option> {
  description: FieldDescription;
  listboxId: string;
  behaviour: ComboboxBehaviour<Option>;
}

function ComboboxInput<Option extends ComboboxOption>(props: ComboboxInputProps<Option>): ReactElement {
  const { description, listboxId, behaviour, query, placeholder, error } = props;
  return (
    <span className={styles.inputFrame}>
      <Icon name="search" />
      <input
        id={description.controlId}
        className={styles.input}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={behaviour.isOpen}
        aria-controls={listboxId}
        aria-activedescendant={behaviour.activeOptionElementId}
        aria-describedby={description.describedBy}
        aria-invalid={error === undefined ? undefined : true}
        placeholder={placeholder}
        value={query}
        {...behaviour.inputHandlers}
      />
    </span>
  );
}

interface ComboboxPopupProps<Option extends ComboboxOption> {
  listboxId: string;
  label: string;
  options: readonly Option[];
  behaviour: ComboboxBehaviour<Option>;
  emptyText: string;
}

function ComboboxPopup<Option extends ComboboxOption>(props: ComboboxPopupProps<Option>): ReactElement {
  const { listboxId, label, options, behaviour, emptyText } = props;
  return (
    <div className={styles.popup} hidden={!behaviour.isOpen}>
      <div id={listboxId} role="listbox" aria-label={label} className={styles.listbox} hidden={options.length === 0}>
        {options.map((option) => (
          <ComboboxOptionRow key={option.id} option={option} behaviour={behaviour} />
        ))}
      </div>
      {options.length === 0 && <p className={styles.empty}>{emptyText}</p>}
    </div>
  );
}

interface ComboboxOptionRowProps<Option extends ComboboxOption> {
  option: Option;
  behaviour: ComboboxBehaviour<Option>;
}

function ComboboxOptionRow<Option extends ComboboxOption>({ option, behaviour }: ComboboxOptionRowProps<Option>): ReactElement {
  function handleMouseDown(event: MouseEvent<HTMLDivElement>): void {
    event.preventDefault();
    behaviour.choose(option);
  }
  return (
    <div
      id={behaviour.optionElementId(option)}
      role="option"
      tabIndex={-1}
      aria-selected={behaviour.activeOptionId === option.id}
      className={styles.option}
      onMouseDown={handleMouseDown}
    >
      {option.leading}
      <span className={styles.optionText}>
        <span className={styles.optionLabel}>{option.label}</span>
        {option.description !== undefined && (
          <>
            {' '}
            <span className={styles.optionDescription}>{option.description}</span>
          </>
        )}
      </span>
    </div>
  );
}

function announcement(optionCount: number, emptyText: string): string {
  if (optionCount === 0) {
    return emptyText;
  }
  return optionCount === 1 ? '1 suggestion available.' : `${String(optionCount)} suggestions available.`;
}
