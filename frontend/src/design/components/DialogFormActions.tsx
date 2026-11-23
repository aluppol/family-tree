import type { ReactElement } from 'react';
import { useT } from '../../i18n/languageContext';
import { Button } from './Button';
import { DialogActions } from './Dialog';

export interface DialogFormActionsProps {
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onCancel: () => void;
}

export function DialogFormActions({ submitLabel, pendingLabel, isPending, onCancel }: DialogFormActionsProps): ReactElement {
  const t = useT();
  return (
    <DialogActions>
      <Button onClick={onCancel}>{t('common.cancel')}</Button>
      <Button type="submit" variant="primary" aria-disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </DialogActions>
  );
}
