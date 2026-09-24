import { type ReactElement, useState } from 'react';
import type { ParentRelation, Person } from '../../api/types';
import { ConfirmDialog } from '../../design/components';
import { fullName } from '../people/personName';
import { AddParentLinkDialog } from './AddParentLinkDialog';
import { ChangeParentLinkKindDialog } from './ChangeParentLinkKindDialog';
import { useRemoveParentLink } from './kinshipQueries';
import { type ParentLinkRelation, parentLinkKindLabel } from './relations';
import { type RelativeEntry, RelativesView } from './RelativesView';

type LinkDialog = { type: 'none' } | { type: 'adding' } | { type: 'changing' | 'removing'; relative: ParentRelation };

const NO_DIALOG: LinkDialog = { type: 'none' };

export interface ParentLinksPanelProps {
  person: Person;
  relation: ParentLinkRelation;
}

export function ParentLinksPanel({ person, relation }: ParentLinksPanelProps): ReactElement {
  const [dialog, setDialog] = useState<LinkDialog>(NO_DIALOG);
  const entries = relation.relativesOf(person).map((relative) => relativeEntry(relative, setDialog));
  function handleClose(): void {
    setDialog(NO_DIALOG);
  }
  return (
    <>
      <RelativesView
        title={relation.title}
        addLabel={`Add ${relation.relativeNoun}`}
        emptyText={relation.emptyText}
        editLabel="Change"
        entries={entries}
        onAdd={() => { setDialog({ type: 'adding' }); }}
      />
      {dialog.type === 'adding' && <AddParentLinkDialog person={person} relation={relation} onClose={handleClose} />}
      {dialog.type === 'changing' && <ChangeParentLinkKindDialog person={person} relation={relation} relative={dialog.relative} onClose={handleClose} />}
      {dialog.type === 'removing' && <RemoveParentLinkDialog person={person} relation={relation} relative={dialog.relative} onClose={handleClose} />}
    </>
  );
}

function relativeEntry(relative: ParentRelation, openDialog: (dialog: LinkDialog) => void): RelativeEntry {
  return {
    key: relative.link_id,
    person: relative.person,
    badge: relative.kind === 'birth' ? undefined : parentLinkKindLabel(relative.kind),
    onEdit: () => {
      openDialog({ type: 'changing', relative });
    },
    onRemove: () => {
      openDialog({ type: 'removing', relative });
    },
  };
}

interface RemoveParentLinkDialogProps {
  person: Person;
  relation: ParentLinkRelation;
  relative: ParentRelation;
  onClose: () => void;
}

function RemoveParentLinkDialog({ person, relation, relative, onClose }: RemoveParentLinkDialogProps): ReactElement {
  const removeLink = useRemoveParentLink();
  const relativeName = fullName(relative.person);
  function handleConfirm(): void {
    removeLink.mutate({ linkId: relative.link_id, personIds: [person.id, relative.person.id] }, { onSuccess: onClose });
  }
  return (
    <ConfirmDialog isOpen title={`Remove ${relativeName} as ${relation.relativeNoun}?`} confirmLabel="Remove link" onConfirm={handleConfirm} onCancel={onClose} isPending={removeLink.isPending} error={removeLink.error}>
      <p>
        Only the link between {fullName(person)} and {relativeName} is removed. Both people stay in your tree.
      </p>
    </ConfirmDialog>
  );
}
