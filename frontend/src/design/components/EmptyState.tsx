import type { ReactElement, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './State.module.scss';

export type StateTitleLevel = 1 | 2;

export interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  icon?: IconName;
  titleLevel?: StateTitleLevel;
}

export function EmptyState({ title, children, actions, icon = 'tree', titleLevel = 2 }: EmptyStateProps): ReactElement {
  return (
    <section className={styles.state}>
      <span className={styles.emblem}>
        <Icon name={icon} />
      </span>
      <StateTitle level={titleLevel}>{title}</StateTitle>
      {children !== undefined && <div className={styles.message}>{children}</div>}
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}

export function StateTitle({ level, children }: { level: StateTitleLevel; children: string }): ReactElement {
  return level === 1 ? <h1 className={styles.title}>{children}</h1> : <h2 className={styles.title}>{children}</h2>;
}
