import type { InputHTMLAttributes, ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './Field.module.scss';
import { FieldError, FieldHint, FieldLabel, type FieldTexts, useFieldDescription } from './fieldParts';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'children'>, FieldTexts {
  label: string;
  isOptional?: boolean;
}

export function TextField({ label, hint, error, id, isOptional, className, ...inputProps }: TextFieldProps): ReactElement {
  const description = useFieldDescription({ id, hint, error });
  return (
    <div className={classNames(styles.field, className)}>
      <FieldLabel htmlFor={description.controlId} label={label} isOptional={isOptional} />
      <FieldHint description={description} hint={hint} />
      <input
        id={description.controlId}
        className={styles.control}
        aria-describedby={description.describedBy}
        aria-invalid={error === undefined ? undefined : true}
        {...inputProps}
      />
      <FieldError description={description} error={error} />
    </div>
  );
}
