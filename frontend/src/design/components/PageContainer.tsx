import type { ReactElement, ReactNode } from 'react';
import { classNames } from '../classNames';
import styles from './PageContainer.module.scss';

export type PageWidth = 'regular' | 'narrow';

export interface PageContainerProps {
  children: ReactNode;
  width?: PageWidth;
}

export function PageContainer({ children, width = 'regular' }: PageContainerProps): ReactElement {
  return <div className={classNames(styles.container, styles[width])}>{children}</div>;
}
