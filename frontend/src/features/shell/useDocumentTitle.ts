import { useEffect } from 'react';
import { useT } from '../../i18n/languageContext';

export function useDocumentTitle(pageTitle: string | null): void {
  const t = useT();
  const appName = t('app.name');
  const title = pageTitle === null ? appName : t('app.pageTitle', { page: pageTitle, app: appName });
  useEffect(() => {
    document.title = title;
  }, [title]);
}
