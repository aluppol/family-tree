import type { ReactElement } from 'react';
import { errorKindOf, errorMessageOf } from '../../api/errorKind';
import { useT } from '../../i18n/languageContext';
import { Icon } from './Icon';
import styles from './InlineError.module.scss';

export interface InlineErrorProps {
  error: unknown;
}

export function InlineError({ error }: InlineErrorProps): ReactElement | null {
  const t = useT();
  if (error === null || error === undefined) {
    return null;
  }
  const hasSessionEnded = errorKindOf(error) === 'session-ended';
  return (
    <p role="alert" className={styles.inlineError}>
      <Icon name="alert" />
      <span>
        {hasSessionEnded ? `${t('states.sessionEndedInline')} ` : errorMessageOf(error, t)}
        {hasSessionEnded && <a href="/">{t('states.signInAgain')}</a>}
      </span>
    </p>
  );
}
