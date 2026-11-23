import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import type { Person, PersonProfile } from '../../api/types';
import { LoadingState } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { profilePath } from '../../routePaths';
import { fullName } from '../people/personName';
import { usePersonIdParam } from '../people/usePersonIdParam';
import { usePerson, useUpdatePerson } from '../person/personQueries';
import { NotFoundView } from '../shell/NotFoundPage';
import { PageError } from '../shell/PageStates';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { draftFromProfile } from './personDraft';
import { PersonFormView } from './PersonFormView';
import { usePersonForm } from './usePersonForm';

export function EditPersonPage(): ReactElement {
  const personId = usePersonIdParam();
  return personId === null ? <NotFoundView /> : <PersonEditor personId={personId} />;
}

function PersonEditor({ personId }: { personId: number }): ReactElement {
  const t = useT();
  const person = usePerson(personId);
  useDocumentTitle(person.data === undefined ? t('personForm.editTitle') : t('personForm.editHeading', { name: fullName(t, person.data) }));
  if (person.isPending) {
    return <LoadingState label={t('personForm.loading')} />;
  }
  if (person.isError) {
    return <PageError error={person.error} onRetry={person.refetch} />;
  }
  return <EditPersonForm person={person.data} />;
}

function EditPersonForm({ person }: { person: Person }): ReactElement {
  const t = useT();
  const navigate = useNavigate();
  const updatePerson = useUpdatePerson();
  function handleValidSubmit(profile: PersonProfile): void {
    updatePerson.mutate(
      { personId: person.id, profile },
      {
        onSuccess: () => {
          void navigate(profilePath(person.id));
        },
      },
    );
  }
  const form = usePersonForm({ initialDraft: draftFromProfile(person), serverError: updatePerson.error, onValidSubmit: handleValidSubmit });
  return (
    <PersonFormView
      heading={t('personForm.editHeading', { name: fullName(t, person) })}
      submitLabel={t('personForm.saveChanges')}
      cancelPath={profilePath(person.id)}
      isSubmitting={updatePerson.isPending}
      serverError={updatePerson.error}
      {...form}
    />
  );
}
