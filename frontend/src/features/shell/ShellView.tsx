import type { ReactElement, ReactNode, RefObject } from 'react';
import { Banner } from '../../design/components';
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
  children: ReactNode;
}

export function ShellView({ viewerName, isSandbox, menu, menuButtonRef, mainRef, children }: ShellViewProps): ReactElement {
  return (
    <div className={styles.shell}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
        Skip to main content
      </a>
      <SiteHeader viewerName={viewerName} menu={menu} menuButtonRef={menuButtonRef} />
      {isSandbox && <SandboxBanner />}
      <main ref={mainRef} id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function SandboxBanner(): ReactElement {
  return (
    <div className={styles.sandbox}>
      <Banner>Demo sandbox — changes are reset every night.</Banner>
    </div>
  );
}
