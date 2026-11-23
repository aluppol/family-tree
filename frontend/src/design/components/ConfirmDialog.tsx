import type { ReactElement, ReactNode } from 'react';
import { useT } from '../../i18n/languageContext';
import { Button } from './Button';
import { Dialog, DialogActions } from './Dialog';
import { InlineError } from './InlineError';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  error?: unknown;
}

export function ConfirmDialog(props: ConfirmDialogProps): ReactElement {
  const { isOpen, title, children, confirmLabel, onConfirm, onCancel, isPending = false, error = null } = props;
  const t = useT();
  function handleConfirm(): void {
    if (!isPending) {
      onConfirm();
    }
  }
  return (
    <Dialog isOpen={isOpen} title={title} onClose={onCancel}>
      {children}
      <InlineError error={error} />
      <DialogActions>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button variant="danger" onClick={handleConfirm} aria-disabled={isPending}>
          {isPending ? t('common.working') : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
