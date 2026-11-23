import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { PartnerRelation } from '../../api/types';
import { Dialog, DialogFormActions, InlineError } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useChangePartnershipTerms } from './kinshipQueries';
import { PartnershipTermsFields } from './PartnershipTermsFields';
import { type TermsErrors, draftFromTerms, termsFromDraft } from './termsDraft';

export interface EditPartnershipDialogProps {
  partnership: PartnerRelation;
  onClose: () => void;
}

export function EditPartnershipDialog({ partnership, onClose }: EditPartnershipDialogProps): ReactElement {
  const t = useT();
  const [draft, setDraft] = useState(() => draftFromTerms(partnership.terms));
  const [errors, setErrors] = useState<TermsErrors>({});
  const changeTerms = useChangePartnershipTerms();
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = termsFromDraft(draft);
    setErrors(parsed.errors ?? {});
    if (parsed.terms !== null && !changeTerms.isPending) {
      changeTerms.mutate({ partnershipId: partnership.partnership_id, terms: parsed.terms }, { onSuccess: onClose });
    }
  }
  return (
    <Dialog isOpen title={t('kinship.spouses.editTitle', { name: fullName(t, partnership.partner) })} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <PartnershipTermsFields draft={draft} errors={errors} onDraftChange={setDraft} />
        <InlineError error={changeTerms.error} />
        <DialogFormActions submitLabel={t('common.save')} pendingLabel={t('common.saving')} isPending={changeTerms.isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
