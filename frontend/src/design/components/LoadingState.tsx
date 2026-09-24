import type { ReactElement } from 'react';
import styles from './State.module.scss';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps): ReactElement {
  return (
    <div role="status" className={styles.loading}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
