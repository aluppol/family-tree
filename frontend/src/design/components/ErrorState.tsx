import type { ReactElement } from 'react';
import { type ErrorKind, errorKindOf, errorMessageOf } from '../../api/errorKind';
import type { TextKey } from '../../i18n/catalogue';
import { useT } from '../../i18n/languageContext';
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

const ERROR_TITLES: Record<ErrorKind, TextKey> = {
  'session-ended': 'states.sessionEndedTitle',
  forbidden: 'states.forbiddenTitle',
  'not-found': 'states.notFoundTitle',
  unavailable: 'states.unavailableTitle',
  rejected: 'states.failedTitle',
  unexpected: 'states.failedTitle',
};

export function ErrorState({ error, onRetry, titleLevel = 2 }: ErrorStateProps): ReactElement {
  const t = useT();
  const kind = errorKindOf(error);
  return (
    <section role="alert" className={styles.state}>
      <span className={styles.dangerEmblem}>
        <Icon name="alert" />
      </span>
      <StateTitle level={titleLevel}>{t(ERROR_TITLES[kind])}</StateTitle>
      <p className={styles.message}>{kind === 'session-ended' ? t('states.sessionEndedMessage') : errorMessageOf(error, t)}</p>
      <ErrorRecovery kind={kind} onRetry={onRetry} />
    </section>
  );
}

function ErrorRecovery({ kind, onRetry }: { kind: ErrorKind; onRetry?: () => void }): ReactElement | null {
  const t = useT();
  if (kind === 'session-ended') {
    return (
      <ButtonAnchor href="/" variant="primary">
        {t('states.signInAgain')}
      </ButtonAnchor>
    );
  }
  if (kind === 'not-found') {
    return <ButtonAnchor href="/">{t('states.goToTree')}</ButtonAnchor>;
  }
  const canRetry = (kind === 'unavailable' || kind === 'unexpected') && onRetry !== undefined;
  return canRetry ? (
    <Button variant="primary" onClick={onRetry}>
      {t('states.tryAgain')}
    </Button>
  ) : null;
}
