import type { ReactElement, RefObject } from 'react';
import { Link } from 'react-router';
import { Button, Icon } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { HOME_PATH } from '../../routePaths';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NAVIGATION_ITEMS } from './navigationItems';
import styles from './Shell.module.scss';

const MENU_ID = 'site-menu';

export interface MenuState {
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

export interface SiteHeaderProps {
  viewerName: string | null;
  menu: MenuState;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

export function SiteHeader({ viewerName, menu, menuButtonRef }: SiteHeaderProps): ReactElement {
  const t = useT();
  return (
    <header className={styles.header}>
      <div className={styles.headerBar}>
        <Link to={HOME_PATH} className={styles.brand} onClick={menu.onNavigate}>
          <BrandMark />
          <span className={styles.brandName}>{t('app.name')}</span>
        </Link>
        <Button ref={menuButtonRef} variant="ghost" className={styles.menuButton} aria-expanded={menu.isOpen} aria-controls={MENU_ID} onClick={menu.onToggle}>
          <Icon name={menu.isOpen ? 'close' : 'menu'} />
          {t('shell.menu')}
        </Button>
        <div id={MENU_ID} className={styles.menu} data-open={menu.isOpen}>
          <MainNavigation pathname={menu.pathname} onNavigate={menu.onNavigate} />
          <AccountLinks viewerName={viewerName} />
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

function MainNavigation({ pathname, onNavigate }: Pick<MenuState, 'pathname' | 'onNavigate'>): ReactElement {
  const t = useT();
  return (
    <nav aria-label={t('shell.mainNavigation')}>
      <ul className={styles.navigationList}>
        {NAVIGATION_ITEMS.map((navigationItem) => (
          <li key={navigationItem.path}>
            <Link to={navigationItem.path} className={styles.navigationLink} aria-current={navigationItem.isActiveAt(pathname) ? 'page' : undefined} onClick={onNavigate}>
              <Icon name={navigationItem.icon} />
              {t(navigationItem.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AccountLinks({ viewerName }: { viewerName: string | null }): ReactElement {
  const t = useT();
  return (
    <div className={styles.account}>
      {viewerName !== null && (
        <span className={styles.viewerName}>
          <Icon name="person" />
          <span>{viewerName}</span>
        </span>
      )}
      <a href="/oauth2/sign_out" className={styles.signOut}>
        <Icon name="signOut" />
        {t('shell.signOut')}
      </a>
    </div>
  );
}
