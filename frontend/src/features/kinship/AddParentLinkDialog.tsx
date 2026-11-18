import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { ParentLinkKind, Person } from '../../api/types';
import { Dialog, DialogFormActions, InlineError, SelectField } from '../../design/components';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useCreateNewRelative, useCreateParentLink } from './kinshipQueries';
import { RelativeChoiceFields } from './RelativeChoiceFields';
import { PARENT_LINK_KIND_OPTIONS, type ParentLinkRelation } from './relations';
import { useRelativeChoice } from './useRelativeChoice';

export interface AddParentLinkDialogProps {
  person: Person;
  relation: ParentLinkRelation;
  onClose: () => void;
}

export function AddParentLinkDialog({ person, relation, onClose }: AddParentLinkDialogProps): ReactElement {
  const choice = useRelativeChoice(relation, person.id, relation.oneWordSurname(person));
  const [kind, setKind] = useState<ParentLinkKind>('birth');
  const createLink = useCreateParentLink();
  const createRelative = useCreateNewRelative(relation.createNewRelative);
  const isPending = createLink.isPending || createRelative.isPending;
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isPending) {
      choice.submit({
        onExistingPerson: (relative) => { createLink.mutate(relation.linkInput({ personId: person.id, relativeId: relative.id, kind }), { onSuccess: onClose }); },
        onNewPerson: (profile) => { createRelative.mutate({ personId: person.id, person: profile, kind }, { onSuccess: onClose }); },
      });
    }
  }
  return (
    <Dialog isOpen title={`Add a ${relation.relativeNoun} of ${fullName(person)}`} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <RelativeChoiceFields choice={choice} label="Person" relativeNoun={relation.relativeNoun} />
        <SelectField label="Relationship" options={PARENT_LINK_KIND_OPTIONS} value={kind} onValueChange={setKind} />
        <InlineError error={choice.newRelative === null ? createLink.error : createRelative.error} />
        <DialogFormActions submitLabel={`Add ${relation.relativeNoun}`} pendingLabel="Adding…" isPending={isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
