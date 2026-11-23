import { type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Person } from '../../api/types';
import { Button, ButtonLink, ConfirmDialog, Icon, InlineError } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { PEOPLE_PATH, editProfilePath, towerPath } from '../../routePaths';
import { fullName } from '../people/personName';
import { useSetHomePerson, useWorkspace } from '../workspace/workspaceQueries';
import { lifeSpanOf } from './lifeSpan';
import { useDeletePerson } from './personQueries';
import styles from './Profile.module.scss';

export function ProfileHeader({ person }: { person: Person }): ReactElement {
  const t = useT();
  const lifeSpan = lifeSpanOf(t, person);
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <h1 className={styles.name}>{fullName(t, person)}</h1>
        {lifeSpan !== '' && <p className={styles.lifeSpan}>{lifeSpan}</p>}
      </div>
      <div className={styles.actions}>
        <ButtonLink to={editProfilePath(person.id)} variant="primary">
          <Icon name="edit" />
          {t('profile.edit')}
        </ButtonLink>
        <ButtonLink to={towerPath(person.id)}>
          <Icon name="tree" />
          {t('profile.showInTree')}
        </ButtonLink>
        <HomePersonAction person={person} />
        <DeletePersonAction person={person} />
      </div>
    </header>
  );
}

function HomePersonAction({ person }: { person: Person }): ReactElement {
  const t = useT();
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
        {isHomePerson ? t('profile.homePerson') : t('profile.setHomePerson')}
      </Button>
      <InlineError error={setHomePerson.error} />
    </>
  );
}

function DeletePersonAction({ person }: { person: Person }): ReactElement {
  const t = useT();
  const navigate = useNavigate();
  const deletePerson = useDeletePerson();
  const [isConfirming, setIsConfirming] = useState(false);
  const name = fullName(t, person);
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
        {t('profile.delete')}
      </Button>
      <ConfirmDialog isOpen={isConfirming} title={t('profile.deleteTitle', { name })} confirmLabel={t('profile.deleteConfirm')} onConfirm={handleConfirm} onCancel={handleCancel} isPending={deletePerson.isPending} error={deletePerson.error}>
        <p>{t('profile.deleteMessage', { name })}</p>
      </ConfirmDialog>
    </>
  );
}
