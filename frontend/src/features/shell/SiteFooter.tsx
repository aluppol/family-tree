import type { ReactElement } from 'react';
import { useT } from '../../i18n/languageContext';
import styles from './Shell.module.scss';

const SOURCE_REPOSITORY_URL = 'https://github.com/aluppol/family-tree';
const PRIVACY_NOTICE_URL = 'https://albert.luppol.com/privacy/';

export function SiteFooter(): ReactElement {
  const t = useT();
  return (
    <footer className={styles.footer}>
      <p className={styles.footerNote}>{t('shell.footerNote')}</p>
      <ul className={styles.footerLinks}>
        <li>
          <a href="/api/docs/">{t('shell.apiLink')}</a>
        </li>
        <li>
          <a href={SOURCE_REPOSITORY_URL}>{t('shell.sourceLink')}</a>
        </li>
        <li>
          <a href={PRIVACY_NOTICE_URL}>{t('shell.privacyLink')}</a>
        </li>
      </ul>
    </footer>
  );
}
