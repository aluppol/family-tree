import type { ReactElement } from 'react';
import styles from './Shell.module.scss';

const SOURCE_REPOSITORY_URL = 'https://github.com/aluppol/family-tree';

export function SiteFooter(): ReactElement {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerNote}>Family Tree — keep a large family straight.</p>
      <ul className={styles.footerLinks}>
        <li>
          <a href="/api/docs/">API</a>
        </li>
        <li>
          <a href={SOURCE_REPOSITORY_URL}>Source code</a>
        </li>
      </ul>
    </footer>
  );
}
