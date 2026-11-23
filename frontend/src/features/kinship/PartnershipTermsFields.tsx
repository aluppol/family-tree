import type { ReactElement } from 'react';
import { SelectField, type SelectOption, TextField } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { optionalMessageText } from '../../i18n/message';
import type { Translate } from '../../i18n/translate';
import { GenealogicalDateField } from '../dates/GenealogicalDateField';
import type { EndReasonChoice, TermsDraft, TermsErrors } from './termsDraft';

const END_REASON_LABELS: Record<EndReasonChoice, 'notEnded' | 'divorce' | 'annulment' | 'separation'> = {
  none: 'notEnded',
  divorce: 'divorce',
  annulment: 'annulment',
  separation: 'separation',
};

const END_REASON_CHOICES: readonly EndReasonChoice[] = ['none', 'divorce', 'annulment', 'separation'];

export interface PartnershipTermsFieldsProps {
  draft: TermsDraft;
  errors: TermsErrors;
  onDraftChange: (draft: TermsDraft) => void;
}

export function PartnershipTermsFields({ draft, errors, onDraftChange }: PartnershipTermsFieldsProps): ReactElement {
  const t = useT();
  function change(update: Partial<TermsDraft>): void {
    onDraftChange({ ...draft, ...update });
  }
  return (
    <>
      <GenealogicalDateField legend={t('kinship.terms.weddingDate')} draft={draft.startDate} error={optionalMessageText(t, errors.startDate)} onDraftChange={(startDate) => { change({ startDate }); }} />
      <TextField label={t('kinship.terms.weddingPlace')} isOptional autoComplete="off" value={draft.startPlace} onChange={(event) => { change({ startPlace: event.target.value }); }} />
      <SelectField label={t('kinship.terms.endedBy')} options={endReasonOptions(t)} value={draft.endReason} onValueChange={(endReason) => { change({ endReason }); }} />
      {draft.endReason !== 'none' && (
        <GenealogicalDateField legend={t('kinship.terms.endDate')} draft={draft.endDate} error={optionalMessageText(t, errors.endDate)} onDraftChange={(endDate) => { change({ endDate }); }} />
      )}
    </>
  );
}

function endReasonOptions(t: Translate): SelectOption<EndReasonChoice>[] {
  return END_REASON_CHOICES.map((choice) => ({ value: choice, label: t(`kinship.terms.${END_REASON_LABELS[choice]}`) }));
}
