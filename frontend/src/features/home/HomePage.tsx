import type { ReactElement } from 'react';
import { Navigate } from 'react-router';
import { LoadingState } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { towerPath } from '../../routePaths';
import { useFirstPerson } from '../people/peopleQueries';
import { PageError } from '../shell/PageStates';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { useWorkspace } from '../workspace/workspaceQueries';
import { EmptyTreeView } from './EmptyTreeView';

export function HomePage(): ReactElement {
  const t = useT();
  const workspace = useWorkspace();
  useDocumentTitle(null);
  if (workspace.isPending) {
    return <LoadingState label={t('home.opening')} />;
  }
  if (workspace.isError) {
    return <PageError error={workspace.error} onRetry={workspace.refetch} />;
  }
  if (workspace.data.home_person_id !== null) {
    return <Navigate replace to={towerPath(workspace.data.home_person_id)} />;
  }
  return workspace.data.people_count > 0 ? <FirstPersonRedirect /> : <EmptyTreeView />;
}

function FirstPersonRedirect(): ReactElement {
  const t = useT();
  const firstPerson = useFirstPerson();
  if (firstPerson.isPending) {
    return <LoadingState label={t('home.opening')} />;
  }
  if (firstPerson.isError) {
    return <PageError error={firstPerson.error} onRetry={firstPerson.refetch} />;
  }
  return firstPerson.data === null ? <EmptyTreeView /> : <Navigate replace to={towerPath(firstPerson.data.id)} />;
}
