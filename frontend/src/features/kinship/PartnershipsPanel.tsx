import { type ReactElement, useState } from 'react';
import type { PartnerRelation, Person } from '../../api/types';
import { ConfirmDialog } from '../../design/components';
import { fullName } from '../people/personName';
import { AddPartnershipDialog } from './AddPartnershipDialog';
import { EditPartnershipDialog } from './EditPartnershipDialog';
import { useRemovePartnership } from './kinshipQueries';
import { type RelativeEntry, RelativesView } from './RelativesView';
import { describeTerms } from './termsDraft';

type PartnershipDialog = { type: 'none' } | { type: 'adding' } | { type: 'editing' | 'removing'; partnership: PartnerRelation };

const NO_DIALOG: PartnershipDialog = { type: 'none' };

export function PartnershipsPanel({ person }: { person: Person }): ReactElement {
  const [dialog, setDialog] = useState<PartnershipDialog>(NO_DIALOG);
  const entries = person.partnerships.map((partnership) => partnershipEntry(partnership, setDialog));
  function handleClose(): void {
    setDialog(NO_DIALOG);
  }
  return (
    <>
      <RelativesView
        title="Partners"
        addLabel="Add partner"
        emptyText="No partners recorded yet."
        editLabel="Edit"
        entries={entries}
        onAdd={() => { setDialog({ type: 'adding' }); }}
      />
      {dialog.type === 'adding' && <AddPartnershipDialog person={person} onClose={handleClose} />}
      {dialog.type === 'editing' && <EditPartnershipDialog partnership={dialog.partnership} onClose={handleClose} />}
      {dialog.type === 'removing' && <RemovePartnershipDialog person={person} partnership={dialog.partnership} onClose={handleClose} />}
    </>
  );
}

function partnershipEntry(partnership: PartnerRelation, openDialog: (dialog: PartnershipDialog) => void): RelativeEntry {
  return {
    key: partnership.partnership_id,
    person: partnership.partner,
    badge: partnership.terms.kind === 'marriage' ? 'Marriage' : 'Partnership',
    detail: describeTerms(partnership.terms),
    onEdit: () => {
      openDialog({ type: 'editing', partnership });
    },
    onRemove: () => {
      openDialog({ type: 'removing', partnership });
    },
  };
}

interface RemovePartnershipDialogProps {
  person: Person;
  partnership: PartnerRelation;
  onClose: () => void;
}

function RemovePartnershipDialog({ person, partnership, onClose }: RemovePartnershipDialogProps): ReactElement {
  const removePartnership = useRemovePartnership();
  const partnerName = fullName(partnership.partner);
  function handleConfirm(): void {
    removePartnership.mutate({ partnershipId: partnership.partnership_id, personIds: [person.id, partnership.partner.id] }, { onSuccess: onClose });
  }
  return (
    <ConfirmDialog isOpen title={`Remove the partnership with ${partnerName}?`} confirmLabel="Remove partnership" onConfirm={handleConfirm} onCancel={onClose} isPending={removePartnership.isPending} error={removePartnership.error}>
      <p>
        Only the partnership between {fullName(person)} and {partnerName} is removed. Both people stay in your tree.
      </p>
    </ConfirmDialog>
  );
}
