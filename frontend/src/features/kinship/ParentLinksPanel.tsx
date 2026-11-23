import { type ReactElement, useState } from 'react';
import type { ParentRelation, Person } from '../../api/types';
import { ConfirmDialog } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import type { Translate } from '../../i18n/translate';
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
  const t = useT();
  const [dialog, setDialog] = useState<LinkDialog>(NO_DIALOG);
  const entries = relation.relativesOf(person).map((relative) => relativeEntry(t, relative, setDialog));
  function handleClose(): void {
    setDialog(NO_DIALOG);
  }
  return (
    <>
      <RelativesView
        title={t(`kinship.${relation.section}.title`)}
        addLabel={t(`kinship.${relation.section}.add`)}
        emptyText={t(`kinship.${relation.section}.empty`)}
        editLabel={t('common.change')}
        entries={entries}
        onAdd={() => { setDialog({ type: 'adding' }); }}
      />
      {dialog.type === 'adding' && <AddParentLinkDialog person={person} relation={relation} onClose={handleClose} />}
      {dialog.type === 'changing' && <ChangeParentLinkKindDialog person={person} relation={relation} relative={dialog.relative} onClose={handleClose} />}
      {dialog.type === 'removing' && <RemoveParentLinkDialog person={person} relation={relation} relative={dialog.relative} onClose={handleClose} />}
    </>
  );
}

function relativeEntry(t: Translate, relative: ParentRelation, openDialog: (dialog: LinkDialog) => void): RelativeEntry {
  return {
    key: relative.link_id,
    person: relative.person,
    badge: relative.kind === 'birth' ? undefined : parentLinkKindLabel(t, relative.kind),
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
  const t = useT();
  const removeLink = useRemoveParentLink();
  const relativeName = fullName(t, relative.person);
  function handleConfirm(): void {
    removeLink.mutate({ linkId: relative.link_id, personIds: [person.id, relative.person.id] }, { onSuccess: onClose });
  }
  return (
    <ConfirmDialog isOpen title={t(`kinship.${relation.section}.removeTitle`, { relative: relativeName })} confirmLabel={t('kinship.removeLink')} onConfirm={handleConfirm} onCancel={onClose} isPending={removeLink.isPending} error={removeLink.error}>
      <p>{t('kinship.linkRemovalMessage', { person: fullName(t, person), relative: relativeName })}</p>
    </ConfirmDialog>
  );
}
