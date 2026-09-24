import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import type { PersonProfile } from '../../api/types';
import { PEOPLE_PATH, profilePath } from '../../routePaths';
import { useCreatePerson } from '../person/personQueries';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { EMPTY_PERSON_DRAFT } from './personDraft';
import { PersonFormView } from './PersonFormView';
import { usePersonForm } from './usePersonForm';

export function NewPersonPage(): ReactElement {
  useDocumentTitle('Add a person');
  const navigate = useNavigate();
  const createPerson = useCreatePerson();
  function handleValidSubmit(profile: PersonProfile): void {
    createPerson.mutate(profile, {
      onSuccess: (person) => {
        void navigate(profilePath(person.id));
      },
    });
  }
  const form = usePersonForm({ initialDraft: EMPTY_PERSON_DRAFT, serverError: createPerson.error, onValidSubmit: handleValidSubmit });
  return (
    <PersonFormView
      heading="Add a person"
      submitLabel="Add person"
      cancelPath={PEOPLE_PATH}
      isSubmitting={createPerson.isPending}
      serverError={createPerson.error}
      {...form}
    />
  );
}
