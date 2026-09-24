import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import type { Person, PersonProfile } from '../../api/types';
import { LoadingState } from '../../design/components';
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
  const person = usePerson(personId);
  useDocumentTitle(person.data === undefined ? 'Edit person' : `Edit ${fullName(person.data)}`);
  if (person.isPending) {
    return <LoadingState label="Loading person…" />;
  }
  if (person.isError) {
    return <PageError error={person.error} onRetry={person.refetch} />;
  }
  return <EditPersonForm person={person.data} />;
}

function EditPersonForm({ person }: { person: Person }): ReactElement {
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
      heading={`Edit ${fullName(person)}`}
      submitLabel="Save changes"
      cancelPath={profilePath(person.id)}
      isSubmitting={updatePerson.isPending}
      serverError={updatePerson.error}
      {...form}
    />
  );
}
