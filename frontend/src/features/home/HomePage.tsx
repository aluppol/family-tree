import type { ReactElement } from 'react';
import { Navigate } from 'react-router';
import { LoadingState } from '../../design/components';
import { treePath } from '../../routePaths';
import { useFirstPerson } from '../people/peopleQueries';
import { PageError } from '../shell/PageStates';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { useWorkspace } from '../workspace/workspaceQueries';
import { EmptyTreeView } from './EmptyTreeView';

const OPENING_LABEL = 'Opening your family tree…';

export function HomePage(): ReactElement {
  const workspace = useWorkspace();
  useDocumentTitle(null);
  if (workspace.isPending) {
    return <LoadingState label={OPENING_LABEL} />;
  }
  if (workspace.isError) {
    return <PageError error={workspace.error} onRetry={workspace.refetch} />;
  }
  if (workspace.data.home_person_id !== null) {
    return <Navigate replace to={treePath(workspace.data.home_person_id)} />;
  }
  return workspace.data.people_count > 0 ? <FirstPersonRedirect /> : <EmptyTreeView />;
}

function FirstPersonRedirect(): ReactElement {
  const firstPerson = useFirstPerson();
  if (firstPerson.isPending) {
    return <LoadingState label={OPENING_LABEL} />;
  }
  if (firstPerson.isError) {
    return <PageError error={firstPerson.error} onRetry={firstPerson.refetch} />;
  }
  return firstPerson.data === null ? <EmptyTreeView /> : <Navigate replace to={treePath(firstPerson.data.id)} />;
}
