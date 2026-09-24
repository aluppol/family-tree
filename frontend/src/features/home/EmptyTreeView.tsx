import type { ReactElement } from 'react';
import { ButtonLink, EmptyState, Icon, PageContainer } from '../../design/components';
import { NEW_PERSON_PATH, TRANSFER_PATH } from '../../routePaths';

export function EmptyTreeView(): ReactElement {
  return (
    <PageContainer width="narrow">
      <EmptyState titleLevel={1} title="Start your family tree" actions={<EmptyTreeActions />}>
        <p>Your tree is empty. Add yourself or a relative to begin, or bring in a family you have already researched in another genealogy program.</p>
      </EmptyState>
    </PageContainer>
  );
}

function EmptyTreeActions(): ReactElement {
  return (
    <>
      <ButtonLink to={NEW_PERSON_PATH} variant="primary">
        <Icon name="plus" />
        Add the first person
      </ButtonLink>
      <ButtonLink to={TRANSFER_PATH}>
        <Icon name="upload" />
        Import a GEDCOM file
      </ButtonLink>
    </>
  );
}
