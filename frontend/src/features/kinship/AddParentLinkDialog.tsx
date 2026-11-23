import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { ParentLinkKind, Person } from '../../api/types';
import { Dialog, DialogFormActions, InlineError, SelectField } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useCreateNewRelative, useCreateParentLink } from './kinshipQueries';
import { RelativeChoiceFields } from './RelativeChoiceFields';
import { type ParentLinkRelation, parentLinkKindOptions } from './relations';
import { useRelativeChoice } from './useRelativeChoice';

export interface AddParentLinkDialogProps {
  person: Person;
  relation: ParentLinkRelation;
  onClose: () => void;
}

export function AddParentLinkDialog({ person, relation, onClose }: AddParentLinkDialogProps): ReactElement {
  const t = useT();
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
    <Dialog isOpen title={t(`kinship.${relation.section}.dialogTitle`, { name: fullName(t, person) })} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <RelativeChoiceFields choice={choice} label={t('kinship.personLabel')} choiceMissingText={t(`kinship.${relation.section}.choiceMissing`)} />
        <SelectField label={t('kinship.relationshipLabel')} options={parentLinkKindOptions(t)} value={kind} onValueChange={setKind} />
        <InlineError error={choice.newRelative === null ? createLink.error : createRelative.error} />
        <DialogFormActions submitLabel={t(`kinship.${relation.section}.add`)} pendingLabel={t('common.adding')} isPending={isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
