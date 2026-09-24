import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { PartnerRelation } from '../../api/types';
import { Dialog, DialogFormActions, InlineError } from '../../design/components';
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
    <Dialog isOpen title={`Partnership with ${fullName(partnership.partner)}`} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <PartnershipTermsFields draft={draft} errors={errors} onDraftChange={setDraft} />
        <InlineError error={changeTerms.error} />
        <DialogFormActions submitLabel="Save" pendingLabel="Saving…" isPending={changeTerms.isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
