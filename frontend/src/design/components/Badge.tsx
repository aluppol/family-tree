import type { ReactElement, ReactNode } from 'react';
import { classNames } from '../classNames';
import styles from './Badge.module.scss';

export type BadgeTone = 'neutral' | 'accent' | 'caution';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps): ReactElement {
  return <span className={classNames(styles.badge, styles[tone])}>{children}</span>;
}
