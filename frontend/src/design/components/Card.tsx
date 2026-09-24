import { type ReactElement, type ReactNode, useId } from 'react';
import { classNames } from '../classNames';
import styles from './Card.module.scss';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps): ReactElement {
  return <div className={classNames(styles.card, className)}>{children}</div>;
}

export interface CardSectionProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function CardSection({ title, children, actions }: CardSectionProps): ReactElement {
  const headingId = useId();
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.sectionHeader}>
        <h2 id={headingId} className={styles.sectionTitle}>
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
