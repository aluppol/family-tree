import type { IconName } from '../../design/components';
import { HOME_PATH, PEOPLE_PATH, TRANSFER_PATH } from '../../routePaths';

export interface NavigationItem {
  label: string;
  path: string;
  icon: IconName;
  isActiveAt: (pathname: string) => boolean;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    label: 'Tree',
    path: HOME_PATH,
    icon: 'tree',
    isActiveAt: (pathname) => pathname === HOME_PATH || pathname.startsWith('/tree/'),
  },
  {
    label: 'People',
    path: PEOPLE_PATH,
    icon: 'people',
    isActiveAt: (pathname) => pathname === PEOPLE_PATH || pathname.startsWith(`${PEOPLE_PATH}/`),
  },
  {
    label: 'Import & export',
    path: TRANSFER_PATH,
    icon: 'transfer',
    isActiveAt: (pathname) => pathname === TRANSFER_PATH,
  },
];
