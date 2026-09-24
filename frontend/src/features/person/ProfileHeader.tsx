import { type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Person } from '../../api/types';
import { Button, ButtonLink, ConfirmDialog, Icon, InlineError } from '../../design/components';
import { PEOPLE_PATH, editProfilePath, treePath } from '../../routePaths';
import { fullName } from '../people/personName';
import { useSetHomePerson, useWorkspace } from '../workspace/workspaceQueries';
import { lifeSpanOf } from './lifeSpan';
import { useDeletePerson } from './personQueries';
import styles from './Profile.module.scss';

export function ProfileHeader({ person }: { person: Person }): ReactElement {
  const lifeSpan = lifeSpanOf(person);
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <h1 className={styles.name}>{fullName(person)}</h1>
        {lifeSpan !== '' && <p className={styles.lifeSpan}>{lifeSpan}</p>}
      </div>
      <div className={styles.actions}>
        <ButtonLink to={editProfilePath(person.id)} variant="primary">
          <Icon name="edit" />
          Edit
        </ButtonLink>
        <ButtonLink to={treePath(person.id)}>
          <Icon name="tree" />
          Show in tree
        </ButtonLink>
        <HomePersonAction person={person} />
        <DeletePersonAction person={person} />
      </div>
    </header>
  );
}

function HomePersonAction({ person }: { person: Person }): ReactElement {
  const workspace = useWorkspace();
  const setHomePerson = useSetHomePerson();
  const isHomePerson = workspace.data?.home_person_id === person.id;
  function handleClick(): void {
    if (!isHomePerson && !setHomePerson.isPending) {
      setHomePerson.mutate(person.id);
    }
  }
  return (
    <>
      <Button onClick={handleClick} aria-disabled={isHomePerson || setHomePerson.isPending}>
        <Icon name={isHomePerson ? 'check' : 'home'} />
        {isHomePerson ? 'Home person' : 'Set as home person'}
      </Button>
      <InlineError error={setHomePerson.error} />
    </>
  );
}

function DeletePersonAction({ person }: { person: Person }): ReactElement {
  const navigate = useNavigate();
  const deletePerson = useDeletePerson();
  const [isConfirming, setIsConfirming] = useState(false);
  const name = fullName(person);
  function handleConfirm(): void {
    deletePerson.mutate(person, { onSuccess: () => void navigate(PEOPLE_PATH) });
  }
  function handleCancel(): void {
    setIsConfirming(false);
    deletePerson.reset();
  }
  return (
    <>
      <Button variant="danger" onClick={() => { setIsConfirming(true); }}>
        <Icon name="trash" />
        Delete
      </Button>
      <ConfirmDialog isOpen={isConfirming} title={`Delete ${name}?`} confirmLabel="Delete person" onConfirm={handleConfirm} onCancel={handleCancel} isPending={deletePerson.isPending} error={deletePerson.error}>
        <p>{name} will be removed from your tree, together with their parent links and partnerships. This cannot be undone.</p>
      </ConfirmDialog>
    </>
  );
}
