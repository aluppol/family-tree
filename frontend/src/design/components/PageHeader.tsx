import type { ReactElement, ReactNode } from 'react';
import styles from './PageHeader.module.scss';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps): ReactElement {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{title}</h1>
        {description !== undefined && <div className={styles.description}>{description}</div>}
      </div>
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
