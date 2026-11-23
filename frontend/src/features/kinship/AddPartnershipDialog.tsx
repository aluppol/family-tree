import { type ReactElement, type SubmitEvent, useState } from 'react';
import { createNewSpouse } from '../../api/kinship';
import type { PartnershipTerms, Person } from '../../api/types';
import { Dialog, DialogFormActions, InlineError } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { useCreateNewRelative, useCreatePartnership } from './kinshipQueries';
import { PartnershipTermsFields } from './PartnershipTermsFields';
import { RelativeChoiceFields } from './RelativeChoiceFields';
import { PARTNERS } from './relations';
import { EMPTY_TERMS_DRAFT, type TermsErrors, termsFromDraft } from './termsDraft';
import { type RelativeChoiceHandlers, useRelativeChoice } from './useRelativeChoice';

export interface AddPartnershipDialogProps {
  person: Person;
  onClose: () => void;
}

interface SpouseRequests {
  isPending: boolean;
  partnershipError: Error | null;
  newSpouseError: Error | null;
  handlersFor: (terms: PartnershipTerms | null) => RelativeChoiceHandlers;
}

const IGNORED_CHOICE: RelativeChoiceHandlers = { onExistingPerson: () => undefined, onNewPerson: () => undefined };

export function AddPartnershipDialog({ person, onClose }: AddPartnershipDialogProps): ReactElement {
  const t = useT();
  const choice = useRelativeChoice(PARTNERS, person.id, '');
  const [draft, setDraft] = useState(EMPTY_TERMS_DRAFT);
  const [errors, setErrors] = useState<TermsErrors>({});
  const spouse = useSpouseRequests(person.id, onClose);
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = termsFromDraft(draft);
    setErrors(parsed.errors ?? {});
    if (!spouse.isPending) {
      choice.submit(spouse.handlersFor(parsed.terms));
    }
  }
  return (
    <Dialog isOpen title={t('kinship.spouses.dialogTitle', { name: fullName(t, person) })} onClose={onClose}>
      <form className={styles.dialogForm} noValidate onSubmit={handleSubmit}>
        <RelativeChoiceFields choice={choice} label={t('kinship.spouses.fieldLabel')} choiceMissingText={t('kinship.spouses.choiceMissing')} />
        <PartnershipTermsFields draft={draft} errors={errors} onDraftChange={setDraft} />
        <InlineError error={choice.newRelative === null ? spouse.partnershipError : spouse.newSpouseError} />
        <DialogFormActions submitLabel={t('kinship.spouses.add')} pendingLabel={t('common.adding')} isPending={spouse.isPending} onCancel={onClose} />
      </form>
    </Dialog>
  );
}

function useSpouseRequests(personId: number, onClose: () => void): SpouseRequests {
  const createPartnership = useCreatePartnership();
  const createSpouse = useCreateNewRelative(createNewSpouse);
  function handlersFor(terms: PartnershipTerms | null): RelativeChoiceHandlers {
    if (terms === null) {
      return IGNORED_CHOICE;
    }
    return {
      onExistingPerson: (partner) => { createPartnership.mutate({ first_partner_id: personId, second_partner_id: partner.id, terms }, { onSuccess: onClose }); },
      onNewPerson: (profile) => { createSpouse.mutate({ personId, person: profile, terms }, { onSuccess: onClose }); },
    };
  }
  return { isPending: createPartnership.isPending || createSpouse.isPending, partnershipError: createPartnership.error, newSpouseError: createSpouse.error, handlersFor };
}
