import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { ParentLinkKind, ParentRelation, Person } from '../../api/types';
import { Dialog, DialogFormActions, InlineError, SelectField } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useChangeParentLinkKind } from './kinshipQueries';
import { type ParentLinkRelation, parentLinkKindOptions } from './relations';

export interface ChangeParentLinkKindDialogProps {
  person: Person;
  relation: ParentLinkRelation;
  relative: ParentRelation;
  onClose: () => void;
}

export function ChangeParentLinkKindDialog({ person, relation, relative, onClose }: ChangeParentLinkKindDialogProps): ReactElement {
  const t = useT();
  const [kind, setKind] = useState<ParentLinkKind>(relative.kind);
  const changeKind = useChangeParentLinkKind();
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!changeKind.isPending) {
      changeKind.mutate({ linkId: relative.link_id, kind }, { onSuccess: onClose });
    }
  }
  return (
    <Dialog isOpen title={t('kinship.changeTitle')} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <p className={styles.dialogText}>
          {t(`kinship.${relation.section}.recordedAs`, { relative: fullName(t, relative.person), person: fullName(t, person) })}
        </p>
        <SelectField label={t('kinship.relationshipLabel')} options={parentLinkKindOptions(t)} value={kind} onValueChange={setKind} />
        <InlineError error={changeKind.error} />
        <DialogFormActions submitLabel={t('common.save')} pendingLabel={t('common.saving')} isPending={changeKind.isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
