import type { InputHTMLAttributes, ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './Field.module.scss';
import { FieldHint, type FieldTexts, useFieldDescription } from './fieldParts';

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'children'>, Omit<FieldTexts, 'error'> {
  label: string;
}

export function CheckboxField({ label, hint, id, className, ...inputProps }: CheckboxFieldProps): ReactElement {
  const description = useFieldDescription({ id, hint });
  return (
    <div className={classNames(styles.checkboxField, className)}>
      <input
        id={description.controlId}
        type="checkbox"
        className={styles.checkbox}
        aria-describedby={description.describedBy}
        {...inputProps}
      />
      <label htmlFor={description.controlId} className={styles.checkboxLabel}>
        {label}
      </label>
      <FieldHint description={description} hint={hint} />
    </div>
  );
}
