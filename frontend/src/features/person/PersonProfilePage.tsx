import type { ReactElement } from 'react';
import type { Person } from '../../api/types';
import { LoadingState, PageContainer } from '../../design/components';
import { CHILDREN, PARENTS } from '../kinship/relations';
import { ParentLinksPanel } from '../kinship/ParentLinksPanel';
import { PartnershipsPanel } from '../kinship/PartnershipsPanel';
import { fullName } from '../people/personName';
import { usePersonIdParam } from '../people/usePersonIdParam';
import { PhotoPanel } from '../photos/PhotoPanel';
import { NotFoundView } from '../shell/NotFoundPage';
import { PageError } from '../shell/PageStates';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { usePerson } from './personQueries';
import styles from './Profile.module.scss';
import { BiographyView, LifeFactsView } from './ProfileFactsView';
import { ProfileHeader } from './ProfileHeader';

export function PersonProfilePage(): ReactElement {
  const personId = usePersonIdParam();
  return personId === null ? <NotFoundView /> : <PersonProfile personId={personId} />;
}

function PersonProfile({ personId }: { personId: number }): ReactElement {
  const person = usePerson(personId);
  useDocumentTitle(person.data === undefined ? null : fullName(person.data));
  if (person.isPending) {
    return <LoadingState label="Loading person…" />;
  }
  if (person.isError) {
    return <PageError error={person.error} onRetry={person.refetch} />;
  }
  return <ProfileContent person={person.data} />;
}

function ProfileContent({ person }: { person: Person }): ReactElement {
  return (
    <PageContainer>
      <ProfileHeader person={person} />
      <div className={styles.layout}>
        <div className={styles.aside}>
          <PhotoPanel person={person} />
          <LifeFactsView person={person} />
        </div>
        <div className={styles.details}>
          <BiographyView biography={person.biography} />
          <ParentLinksPanel person={person} relation={PARENTS} />
          <PartnershipsPanel person={person} />
          <ParentLinksPanel person={person} relation={CHILDREN} />
        </div>
      </div>
    </PageContainer>
  );
}
