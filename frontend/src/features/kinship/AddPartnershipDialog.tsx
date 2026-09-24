import { type ReactElement, type SubmitEvent, useState } from 'react';
import type { Person } from '../../api/types';
import { Dialog, DialogFormActions, InlineError, SearchCombobox } from '../../design/components';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useCreatePartnership } from './kinshipQueries';
import { PartnershipTermsFields } from './PartnershipTermsFields';
import { PARTNERS } from './relations';
import { EMPTY_TERMS_DRAFT, type TermsErrors, termsFromDraft } from './termsDraft';
import { useCandidatePicker } from './useCandidatePicker';

export interface AddPartnershipDialogProps {
  person: Person;
  onClose: () => void;
}

export function AddPartnershipDialog({ person, onClose }: AddPartnershipDialogProps): ReactElement {
  const { selectedPerson, ...candidateSearch } = useCandidatePicker(PARTNERS, person.id);
  const [draft, setDraft] = useState(EMPTY_TERMS_DRAFT);
  const [errors, setErrors] = useState<TermsErrors>({});
  const [hasTriedWithoutPartner, setHasTriedWithoutPartner] = useState(false);
  const createPartnership = useCreatePartnership();
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = termsFromDraft(draft);
    setErrors(parsed.errors ?? {});
    setHasTriedWithoutPartner(selectedPerson === null);
    if (selectedPerson !== null && parsed.terms !== null && !createPartnership.isPending) {
      createPartnership.mutate({ first_partner_id: person.id, second_partner_id: selectedPerson.id, terms: parsed.terms }, { onSuccess: onClose });
    }
  }
  const partnerError = hasTriedWithoutPartner && selectedPerson === null ? 'Choose a partner from the suggestions.' : undefined;
  return (
    <Dialog isOpen title={`Add a partner of ${fullName(person)}`} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <SearchCombobox label="Partner" placeholder="Search by name" emptyMessage="No one matches" error={partnerError} {...candidateSearch} />
        <PartnershipTermsFields draft={draft} errors={errors} onDraftChange={setDraft} />
        <InlineError error={createPartnership.error} />
        <DialogFormActions submitLabel="Add partner" pendingLabel="Adding…" isPending={createPartnership.isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
