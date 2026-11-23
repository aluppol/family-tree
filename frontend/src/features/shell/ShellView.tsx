import type { ReactElement, ReactNode, RefObject } from 'react';
import { Banner } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import styles from './Shell.module.scss';
import { SiteFooter } from './SiteFooter';
import { type MenuState, SiteHeader } from './SiteHeader';

const MAIN_CONTENT_ID = 'main-content';

export interface ShellViewProps {
  viewerName: string | null;
  isSandbox: boolean;
  menu: MenuState;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  mainRef: RefObject<HTMLElement | null>;
  isNavigating: boolean;
  children: ReactNode;
}

export function ShellView({ viewerName, isSandbox, menu, menuButtonRef, mainRef, isNavigating, children }: ShellViewProps): ReactElement {
  const t = useT();
  return (
    <div className={styles.shell}>
      {isNavigating && <div className={styles.progress} role="progressbar" aria-label={t('shell.loadingPage')} />}
      <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
        {t('shell.skipToContent')}
      </a>
      <SiteHeader viewerName={viewerName} menu={menu} menuButtonRef={menuButtonRef} />
      {isSandbox && <SandboxBanner />}
      <main ref={mainRef} id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main} aria-busy={isNavigating}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function SandboxBanner(): ReactElement {
  const t = useT();
  return (
    <div className={styles.sandbox}>
      <Banner>{t('shell.sandboxNotice')}</Banner>
    </div>
  );
}
