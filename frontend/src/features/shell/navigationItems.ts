import type { IconName } from '../../design/components';
import type { TextKey } from '../../i18n/catalogue';
import { HOME_PATH, PEOPLE_PATH, TRANSFER_PATH } from '../../routePaths';

export interface NavigationItem {
  labelKey: TextKey;
  path: string;
  icon: IconName;
  isActiveAt: (pathname: string) => boolean;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    labelKey: 'shell.treeLink',
    path: HOME_PATH,
    icon: 'tree',
    isActiveAt: (pathname) => pathname === HOME_PATH || pathname.startsWith('/tree/') || pathname.startsWith('/tower/'),
  },
  {
    labelKey: 'shell.peopleLink',
    path: PEOPLE_PATH,
    icon: 'people',
    isActiveAt: (pathname) => pathname === PEOPLE_PATH || pathname.startsWith(`${PEOPLE_PATH}/`),
  },
  {
    labelKey: 'shell.transferLink',
    path: TRANSFER_PATH,
    icon: 'transfer',
    isActiveAt: (pathname) => pathname === TRANSFER_PATH,
  },
];
