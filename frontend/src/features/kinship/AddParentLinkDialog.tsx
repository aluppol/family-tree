import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { ParentLinkKind, Person } from '../../api/types';
import { Dialog, DialogFormActions, InlineError, SearchCombobox, SelectField } from '../../design/components';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useCreateParentLink } from './kinshipQueries';
import { PARENT_LINK_KIND_OPTIONS, type ParentLinkRelation } from './relations';
import { useCandidatePicker } from './useCandidatePicker';

export interface AddParentLinkDialogProps {
  person: Person;
  relation: ParentLinkRelation;
  onClose: () => void;
}

export function AddParentLinkDialog({ person, relation, onClose }: AddParentLinkDialogProps): ReactElement {
  const { selectedPerson, ...candidateSearch } = useCandidatePicker(relation, person.id);
  const [kind, setKind] = useState<ParentLinkKind>('birth');
  const [hasTriedWithoutPerson, setHasTriedWithoutPerson] = useState(false);
  const createLink = useCreateParentLink();
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selectedPerson === null) {
      setHasTriedWithoutPerson(true);
    } else if (!createLink.isPending) {
      createLink.mutate(relation.linkInput({ personId: person.id, relativeId: selectedPerson.id, kind }), { onSuccess: onClose });
    }
  }
  const pickError = hasTriedWithoutPerson && selectedPerson === null ? `Choose a ${relation.relativeNoun} from the suggestions.` : undefined;
  return (
    <Dialog isOpen title={`Add a ${relation.relativeNoun} of ${fullName(person)}`} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <SearchCombobox label="Person" placeholder="Search by name" emptyMessage="No one matches" error={pickError} {...candidateSearch} />
        <SelectField label="Relationship" options={PARENT_LINK_KIND_OPTIONS} value={kind} onValueChange={setKind} />
        <InlineError error={createLink.error} />
        <DialogFormActions submitLabel={`Add ${relation.relativeNoun}`} pendingLabel="Adding…" isPending={createLink.isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
