import type { ReactElement } from 'react';
import { type ErrorKind, errorKindOf, errorMessageOf } from '../../api/errorKind';
import { Button } from './Button';
import { ButtonAnchor } from './ButtonLink';
import { type StateTitleLevel, StateTitle } from './EmptyState';
import { Icon } from './Icon';
import styles from './State.module.scss';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  titleLevel?: StateTitleLevel;
}

const ERROR_TITLES: Record<ErrorKind, string> = {
  'session-ended': 'Your session has ended',
  forbidden: 'You do not have access',
  'not-found': 'Not found',
  unavailable: 'Cannot reach the server',
  rejected: 'Something went wrong',
  unexpected: 'Something went wrong',
};

const SESSION_ENDED_MESSAGE = 'For your security you were signed out. Sign in again to keep working on your tree.';

export function ErrorState({ error, onRetry, titleLevel = 2 }: ErrorStateProps): ReactElement {
  const kind = errorKindOf(error);
  return (
    <section role="alert" className={styles.state}>
      <span className={styles.dangerEmblem}>
        <Icon name="alert" />
      </span>
      <StateTitle level={titleLevel}>{ERROR_TITLES[kind]}</StateTitle>
      <p className={styles.message}>{kind === 'session-ended' ? SESSION_ENDED_MESSAGE : errorMessageOf(error)}</p>
      <ErrorRecovery kind={kind} onRetry={onRetry} />
    </section>
  );
}

function ErrorRecovery({ kind, onRetry }: { kind: ErrorKind; onRetry?: () => void }): ReactElement | null {
  if (kind === 'session-ended') {
    return (
      <ButtonAnchor href="/" variant="primary">
        Sign in again
      </ButtonAnchor>
    );
  }
  if (kind === 'not-found') {
    return <ButtonAnchor href="/">Go to your family tree</ButtonAnchor>;
  }
  const canRetry = (kind === 'unavailable' || kind === 'unexpected') && onRetry !== undefined;
  return canRetry ? (
    <Button variant="primary" onClick={onRetry}>
      Try again
    </Button>
  ) : null;
}
