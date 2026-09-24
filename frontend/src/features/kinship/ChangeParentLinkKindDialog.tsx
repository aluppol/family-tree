import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { ParentLinkKind, ParentRelation, Person } from '../../api/types';
import { Dialog, DialogFormActions, InlineError, SelectField } from '../../design/components';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useChangeParentLinkKind } from './kinshipQueries';
import { PARENT_LINK_KIND_OPTIONS, type ParentLinkRelation } from './relations';

export interface ChangeParentLinkKindDialogProps {
  person: Person;
  relation: ParentLinkRelation;
  relative: ParentRelation;
  onClose: () => void;
}

export function ChangeParentLinkKindDialog({ person, relation, relative, onClose }: ChangeParentLinkKindDialogProps): ReactElement {
  const [kind, setKind] = useState<ParentLinkKind>(relative.kind);
  const changeKind = useChangeParentLinkKind();
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!changeKind.isPending) {
      changeKind.mutate({ linkId: relative.link_id, kind }, { onSuccess: onClose });
    }
  }
  return (
    <Dialog isOpen title="Change relationship" onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <p className={styles.dialogText}>
          {fullName(relative.person)} is recorded as a {relation.relativeNoun} of {fullName(person)}.
        </p>
        <SelectField label="Relationship" options={PARENT_LINK_KIND_OPTIONS} value={kind} onValueChange={setKind} />
        <InlineError error={changeKind.error} />
        <DialogFormActions submitLabel="Save" pendingLabel="Saving…" isPending={changeKind.isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
