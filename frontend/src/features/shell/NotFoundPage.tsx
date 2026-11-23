import type { ReactElement } from 'react';
import { ButtonLink, EmptyState, PageContainer } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { HOME_PATH, PEOPLE_PATH } from '../../routePaths';
import { useDocumentTitle } from './useDocumentTitle';

export function NotFoundPage(): ReactElement {
  const t = useT();
  useDocumentTitle(t('shell.notFoundTitle'));
  return <NotFoundView />;
}

export function NotFoundView(): ReactElement {
  const t = useT();
  return (
    <PageContainer width="narrow">
      <EmptyState titleLevel={1} icon="search" title={t('shell.notFoundTitle')} actions={<NotFoundActions />}>
        <p>{t('shell.notFoundMessage')}</p>
      </EmptyState>
    </PageContainer>
  );
}

function NotFoundActions(): ReactElement {
  const t = useT();
  return (
    <>
      <ButtonLink to={HOME_PATH} variant="primary">
        {t('states.goToTree')}
      </ButtonLink>
      <ButtonLink to={PEOPLE_PATH}>{t('shell.browsePeople')}</ButtonLink>
    </>
  );
}
