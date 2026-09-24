import type { ReactElement } from 'react';
import { errorKindOf, errorMessageOf } from '../../api/errorKind';
import { Icon } from './Icon';
import styles from './InlineError.module.scss';

export interface InlineErrorProps {
  error: unknown;
}

export function InlineError({ error }: InlineErrorProps): ReactElement | null {
  if (error === null || error === undefined) {
    return null;
  }
  const hasSessionEnded = errorKindOf(error) === 'session-ended';
  return (
    <p role="alert" className={styles.inlineError}>
      <Icon name="alert" />
      <span>
        {hasSessionEnded ? 'Your session has ended. ' : errorMessageOf(error)}
        {hasSessionEnded && <a href="/">Sign in again</a>}
      </span>
    </p>
  );
}
