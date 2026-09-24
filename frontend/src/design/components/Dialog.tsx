import { type ReactElement, type ReactNode, type SyntheticEvent, useId } from 'react';
import { IconButton } from './Button';
import styles from './Dialog.module.scss';
import { Icon } from './Icon';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ isOpen, ...openDialogProps }: DialogProps): ReactElement | null {
  return isOpen ? <OpenDialog {...openDialogProps} /> : null;
}

export interface DialogActionsProps {
  children: ReactNode;
}

export function DialogActions({ children }: DialogActionsProps): ReactElement {
  return <div className={styles.actions}>{children}</div>;
}

function OpenDialog({ title, onClose, children }: Omit<DialogProps, 'isOpen'>): ReactElement {
  const titleId = useId();
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    onClose();
  }
  return (
    <dialog ref={showModalWhileAttached} className={styles.dialog} aria-labelledby={titleId} onCancel={handleCancel}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
      <IconButton className={styles.close} label="Close" icon={<Icon name="close" />} variant="ghost" onClick={onClose} />
    </dialog>
  );
}

function showModalWhileAttached(dialog: HTMLDialogElement): () => void {
  const opener = document.activeElement;
  dialog.showModal();
  return () => {
    dialog.close();
    if (opener instanceof HTMLElement) {
      opener.focus();
    }
  };
}
