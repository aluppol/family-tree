import type { ReactElement } from 'react';
import { useRouteError } from 'react-router';
import { ErrorState, PageContainer } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { useDocumentTitle } from './useDocumentTitle';

export function RouteErrorPage(): ReactElement {
  const routeError = useRouteError();
  const t = useT();
  useDocumentTitle(t('shell.routeErrorTitle'));
  return (
    <PageContainer width="narrow">
      <ErrorState error={routeError} titleLevel={1} onRetry={reloadPage} />
    </PageContainer>
  );
}

function reloadPage(): void {
  window.location.reload();
}
