import { type ChangeEvent, type ReactElement, type ReactNode, useId } from 'react';
import styles from './FileButton.module.scss';
import { type ButtonAppearance, buttonClassName } from './buttonClassName';

export interface FileButtonProps extends ButtonAppearance {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  icon?: ReactNode;
  disabled?: boolean;
}

export function FileButton({ label, accept, onFileSelect, icon, disabled, variant, size }: FileButtonProps): ReactElement {
  const inputId = useId();
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const chosenFile = event.target.files?.item(0) ?? null;
    event.target.value = '';
    if (chosenFile !== null) {
      onFileSelect(chosenFile);
    }
  }
  return (
    <span className={styles.fileButton}>
      <input id={inputId} type="file" accept={accept} className={styles.input} onChange={handleChange} disabled={disabled} />
      <label htmlFor={inputId} className={buttonClassName({ variant, size }, styles.label)}>
        {icon}
        {label}
      </label>
    </span>
  );
}
