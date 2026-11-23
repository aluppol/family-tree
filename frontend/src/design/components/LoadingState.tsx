import type { ReactElement } from 'react';
import { useT } from '../../i18n/languageContext';
import styles from './State.module.scss';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps): ReactElement {
  const t = useT();
  return (
    <div role="status" className={styles.loading}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">{label ?? t('common.loading')}</span>
    </div>
  );
}
