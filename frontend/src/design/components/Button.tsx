import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import { classNames } from '../classNames';
import styles from './Button.module.scss';
import { type ButtonAppearance, buttonClassName } from './buttonClassName';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonAppearance {
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant, size, type = 'button', className, ...buttonProps }: ButtonProps): ReactElement {
  return <button type={type} className={buttonClassName({ variant, size }, className)} {...buttonProps} />;
}

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'aria-label' | 'title'> {
  label: string;
  icon: ReactNode;
}

export function IconButton({ label, icon, className, ...buttonProps }: IconButtonProps): ReactElement {
  return (
    <Button aria-label={label} title={label} className={classNames(styles.iconOnly, className)} {...buttonProps}>
      {icon}
    </Button>
  );
}
