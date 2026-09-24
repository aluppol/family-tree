import type { ReactElement, ReactNode } from 'react';
import { classNames } from '../classNames';
import styles from './Banner.module.scss';
import { Icon } from './Icon';

export type BannerTone = 'info' | 'success';

export interface BannerProps {
  children: ReactNode;
  tone?: BannerTone;
}

export function Banner({ children, tone = 'info' }: BannerProps): ReactElement {
  return (
    <div className={classNames(styles.banner, styles[tone])}>
      <Icon name={tone === 'success' ? 'check' : 'info'} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
