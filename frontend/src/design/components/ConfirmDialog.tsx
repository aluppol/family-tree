import type { ReactElement, ReactNode } from 'react';
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
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={handleConfirm} aria-disabled={isPending}>
          {isPending ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
