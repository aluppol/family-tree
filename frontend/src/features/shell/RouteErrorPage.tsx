import type { ReactElement } from 'react';
import { useRouteError } from 'react-router';
import { ErrorState, PageContainer } from '../../design/components';
import { useDocumentTitle } from './useDocumentTitle';

export function RouteErrorPage(): ReactElement {
  const routeError = useRouteError();
  useDocumentTitle('Something went wrong');
  return (
    <PageContainer width="narrow">
      <ErrorState error={routeError} titleLevel={1} onRetry={reloadPage} />
    </PageContainer>
  );
}

function reloadPage(): void {
  window.location.reload();
}
