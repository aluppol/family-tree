import type { ReactElement } from 'react';
import { ButtonLink, EmptyState, Icon, PageContainer } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { NEW_PERSON_PATH, TRANSFER_PATH } from '../../routePaths';

export function EmptyTreeView(): ReactElement {
  const t = useT();
  return (
    <PageContainer width="narrow">
      <EmptyState titleLevel={1} title={t('home.emptyTitle')} actions={<EmptyTreeActions />}>
        <p>{t('home.emptyMessage')}</p>
      </EmptyState>
    </PageContainer>
  );
}

function EmptyTreeActions(): ReactElement {
  const t = useT();
  return (
    <>
      <ButtonLink to={NEW_PERSON_PATH} variant="primary">
        <Icon name="plus" />
        {t('home.addFirstPerson')}
      </ButtonLink>
      <ButtonLink to={TRANSFER_PATH}>
        <Icon name="upload" />
        {t('people.importGedcom')}
      </ButtonLink>
    </>
  );
}
