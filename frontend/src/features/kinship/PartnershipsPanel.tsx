import { type ReactElement, useState } from 'react';
import type { PartnerRelation, Person, Sex } from '../../api/types';
import { ConfirmDialog } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import type { Translate } from '../../i18n/translate';
import { fullName } from '../people/personName';
import { AddPartnershipDialog } from './AddPartnershipDialog';
import { EditPartnershipDialog } from './EditPartnershipDialog';
import { useRemovePartnership } from './kinshipQueries';
import { type RelativeEntry, RelativesView } from './RelativesView';
import { describeTerms } from './termsDraft';

type PartnershipDialog = { type: 'none' } | { type: 'adding' } | { type: 'editing' | 'removing'; partnership: PartnerRelation };

const NO_DIALOG: PartnershipDialog = { type: 'none' };

const SPOUSE_WORDS: Record<Sex, 'husband' | 'wife' | 'spouse'> = { male: 'husband', female: 'wife', other: 'spouse', unknown: 'spouse' };

export function PartnershipsPanel({ person }: { person: Person }): ReactElement {
  const t = useT();
  const [dialog, setDialog] = useState<PartnershipDialog>(NO_DIALOG);
  const entries = person.partnerships.map((partnership) => partnershipEntry(t, partnership, setDialog));
  function handleClose(): void {
    setDialog(NO_DIALOG);
  }
  return (
    <>
      <RelativesView
        title={t('kinship.spouses.title')}
        addLabel={t('kinship.spouses.add')}
        emptyText={t('kinship.spouses.empty')}
        editLabel={t('common.edit')}
        entries={entries}
        onAdd={() => { setDialog({ type: 'adding' }); }}
      />
      {dialog.type === 'adding' && <AddPartnershipDialog person={person} onClose={handleClose} />}
      {dialog.type === 'editing' && <EditPartnershipDialog partnership={dialog.partnership} onClose={handleClose} />}
      {dialog.type === 'removing' && <RemovePartnershipDialog person={person} partnership={dialog.partnership} onClose={handleClose} />}
    </>
  );
}

function partnershipEntry(t: Translate, partnership: PartnerRelation, openDialog: (dialog: PartnershipDialog) => void): RelativeEntry {
  return {
    key: partnership.partnership_id,
    person: partnership.partner,
    badge: t(`kinship.spouses.${SPOUSE_WORDS[partnership.partner.sex]}`),
    detail: describeTerms(t, partnership.terms),
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
  const t = useT();
  const removePartnership = useRemovePartnership();
  const partnerName = fullName(t, partnership.partner);
  function handleConfirm(): void {
    removePartnership.mutate({ partnershipId: partnership.partnership_id, personIds: [person.id, partnership.partner.id] }, { onSuccess: onClose });
  }
  return (
    <ConfirmDialog isOpen title={t('kinship.spouses.removeTitle', { name: partnerName })} confirmLabel={t('kinship.spouses.removeConfirm')} onConfirm={handleConfirm} onCancel={onClose} isPending={removePartnership.isPending} error={removePartnership.error}>
      <p>{t('kinship.spouses.removalMessage', { person: fullName(t, person), partner: partnerName })}</p>
    </ConfirmDialog>
  );
}
