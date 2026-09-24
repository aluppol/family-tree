import type { ReactElement, TextareaHTMLAttributes } from 'react';
import { classNames } from '../classNames';
import styles from './Field.module.scss';
import { FieldError, FieldHint, FieldLabel, type FieldTexts, useFieldDescription } from './fieldParts';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'children'>, FieldTexts {
  label: string;
  isOptional?: boolean;
}

export function TextArea({ label, hint, error, id, isOptional, className, ...textAreaProps }: TextAreaProps): ReactElement {
  const description = useFieldDescription({ id, hint, error });
  return (
    <div className={classNames(styles.field, className)}>
      <FieldLabel htmlFor={description.controlId} label={label} isOptional={isOptional} />
      <FieldHint description={description} hint={hint} />
      <textarea
        id={description.controlId}
        className={classNames(styles.control, styles.multiline)}
        aria-describedby={description.describedBy}
        aria-invalid={error === undefined ? undefined : true}
        {...textAreaProps}
      />
      <FieldError description={description} error={error} />
    </div>
  );
}
