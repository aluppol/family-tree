import { type ReactElement, useId } from 'react';
import styles from './Field.module.scss';

export interface FieldTexts {
  id?: string;
  hint?: string;
  error?: string;
}

export interface FieldDescription {
  controlId: string;
  hintId: string;
  errorId: string;
  describedBy: string | undefined;
}

export function useFieldDescription({ id, hint, error }: FieldTexts): FieldDescription {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describingIds = [hint === undefined ? '' : hintId, error === undefined ? '' : errorId].filter((describingId) => describingId !== '');
  return { controlId, hintId, errorId, describedBy: describingIds.length === 0 ? undefined : describingIds.join(' ') };
}

export interface FieldLabelProps {
  htmlFor: string;
  label: string;
  isOptional?: boolean;
}

export function FieldLabel({ htmlFor, label, isOptional = false }: FieldLabelProps): ReactElement {
  return (
    <label htmlFor={htmlFor} className={styles.label}>
      {label}
      {isOptional && (
        <>
          {' '}
          <span className={styles.optional}>(optional)</span>
        </>
      )}
    </label>
  );
}

export interface FieldMessagesProps {
  description: FieldDescription;
  hint?: string;
  error?: string;
}

export function FieldHint({ description, hint }: FieldMessagesProps): ReactElement | null {
  return hint === undefined ? null : (
    <p id={description.hintId} className={styles.hint}>
      {hint}
    </p>
  );
}

export function FieldError({ description, error }: FieldMessagesProps): ReactElement | null {
  return error === undefined ? null : (
    <p id={description.errorId} className={styles.error}>
      {error}
    </p>
  );
}
