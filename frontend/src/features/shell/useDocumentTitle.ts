import { useEffect } from 'react';

const APP_NAME = 'Family Tree';

export function useDocumentTitle(pageTitle: string | null): void {
  useEffect(() => {
    document.title = pageTitle === null ? APP_NAME : `${pageTitle} · ${APP_NAME}`;
  }, [pageTitle]);
}
