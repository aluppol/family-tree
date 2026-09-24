import type { ChangeEvent, ReactElement, SelectHTMLAttributes } from 'react';
import { classNames } from '../classNames';
import styles from './Field.module.scss';
import { type FieldDescription, FieldError, FieldHint, FieldLabel, type FieldTexts, useFieldDescription } from './fieldParts';

export interface SelectOption<Value extends string> {
  value: Value;
  label: string;
}

type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children' | 'value' | 'onChange'>;

interface SelectChoices<Value extends string> {
  options: readonly SelectOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}

export interface SelectFieldProps<Value extends string> extends NativeSelectProps, FieldTexts, SelectChoices<Value> {
  label: string;
  isOptional?: boolean;
}

export function SelectField<Value extends string>(props: SelectFieldProps<Value>): ReactElement {
  const { label, hint, error, id, isOptional, className, ...controlProps } = props;
  const description = useFieldDescription({ id, hint, error });
  return (
    <div className={classNames(styles.field, className)}>
      <FieldLabel htmlFor={description.controlId} label={label} isOptional={isOptional} />
      <FieldHint description={description} hint={hint} />
      <SelectControl description={description} isInvalid={error !== undefined} {...controlProps} />
      <FieldError description={description} error={error} />
    </div>
  );
}

interface SelectControlProps<Value extends string> extends NativeSelectProps, SelectChoices<Value> {
  description: FieldDescription;
  isInvalid: boolean;
}

function SelectControl<Value extends string>(props: SelectControlProps<Value>): ReactElement {
  const { description, isInvalid, options, value, onValueChange, ...selectProps } = props;
  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const chosenOption = options.find((option) => option.value === event.target.value);
    if (chosenOption !== undefined) {
      onValueChange(chosenOption.value);
    }
  }
  return (
    <span className={styles.selectFrame}>
      <select
        id={description.controlId}
        className={classNames(styles.control, styles.select)}
        value={value}
        onChange={handleChange}
        aria-describedby={description.describedBy}
        aria-invalid={isInvalid ? true : undefined}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
