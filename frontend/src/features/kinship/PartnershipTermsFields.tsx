import type { ReactElement } from 'react';
import { SelectField, type SelectOption, TextField } from '../../design/components';
import { GenealogicalDateField } from '../dates/GenealogicalDateField';
import type { EndReasonChoice, TermsDraft, TermsErrors } from './termsDraft';

const END_REASON_OPTIONS: readonly SelectOption<EndReasonChoice>[] = [
  { value: 'none', label: 'Has not ended' },
  { value: 'divorce', label: 'Divorce' },
  { value: 'annulment', label: 'Annulment' },
  { value: 'separation', label: 'Separation' },
];

export interface PartnershipTermsFieldsProps {
  draft: TermsDraft;
  errors: TermsErrors;
  onDraftChange: (draft: TermsDraft) => void;
}

export function PartnershipTermsFields({ draft, errors, onDraftChange }: PartnershipTermsFieldsProps): ReactElement {
  function change(update: Partial<TermsDraft>): void {
    onDraftChange({ ...draft, ...update });
  }
  return (
    <>
      <GenealogicalDateField legend="Wedding date" draft={draft.startDate} error={errors.startDate} onDraftChange={(startDate) => { change({ startDate }); }} />
      <TextField label="Wedding place" isOptional autoComplete="off" value={draft.startPlace} onChange={(event) => { change({ startPlace: event.target.value }); }} />
      <SelectField label="Ended by" options={END_REASON_OPTIONS} value={draft.endReason} onValueChange={(endReason) => { change({ endReason }); }} />
      {draft.endReason !== 'none' && (
        <GenealogicalDateField legend="End date" draft={draft.endDate} error={errors.endDate} onDraftChange={(endDate) => { change({ endDate }); }} />
      )}
    </>
  );
}
