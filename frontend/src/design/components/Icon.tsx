import type { ReactElement } from 'react';
import styles from './Icon.module.scss';

const ICON_PATHS = {
  alert: 'M12 3.5 21.5 20h-19zM12 10v4.5M12 17.2v.3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 17.5V20h15v-2.5',
  edit: 'M4 20h4.2L19.5 8.7a2.1 2.1 0 0 0-3-3L5.2 17v3zM14.5 7.5l3 3',
  home: 'M3.5 11 12 4l8.5 7M6 9.5V20h4.5v-5.5h3V20H18V9.5',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17zM12 11v5.5M12 7.8v.3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  minus: 'M5 12h14',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 1 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 13.8a6.5 6.5 0 0 1 3.5 6.2',
  person: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 1 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  photo: 'M4 8h3.5l2-2.5h5l2 2.5H20v11H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 1 0 0 6z',
  plus: 'M12 5v14M5 12h14',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13zM15.3 15.3 20 20',
  signOut: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z',
  transfer: 'M7 4v15M3.5 15.5 7 19l3.5-3.5M17 20V5M13.5 8.5 17 5l3.5 3.5',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10.5 11v5.5M13.5 11v5.5',
  tree: 'M9.5 3.5h5v4h-5zM3.5 16.5h5v4h-5zM15.5 16.5h5v4h-5zM12 7.5V12M6 12h12M6 12v4.5M18 12v4.5',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 17.5V20h15v-2.5',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps {
  name: IconName;
}

export function Icon({ name }: IconProps): ReactElement {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
