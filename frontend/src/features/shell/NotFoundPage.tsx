import type { ReactElement } from 'react';
import { ButtonLink, EmptyState, PageContainer } from '../../design/components';
import { HOME_PATH, PEOPLE_PATH } from '../../routePaths';
import { useDocumentTitle } from './useDocumentTitle';

export function NotFoundPage(): ReactElement {
  useDocumentTitle('Page not found');
  return <NotFoundView />;
}

export function NotFoundView(): ReactElement {
  return (
    <PageContainer width="narrow">
      <EmptyState titleLevel={1} icon="search" title="Page not found" actions={<NotFoundActions />}>
        <p>We could not find the page you asked for. Check the address, or continue from your tree.</p>
      </EmptyState>
    </PageContainer>
  );
}

function NotFoundActions(): ReactElement {
  return (
    <>
      <ButtonLink to={HOME_PATH} variant="primary">
        Go to your family tree
      </ButtonLink>
      <ButtonLink to={PEOPLE_PATH}>Browse people</ButtonLink>
    </>
  );
}
