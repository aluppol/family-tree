import { classNames } from '../classNames';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonSize = 'regular' | 'small';

export interface ButtonAppearance {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function buttonClassName({ variant = 'secondary', size = 'regular' }: ButtonAppearance, extraClassName?: string): string {
  return classNames(styles.button, styles[variant], styles[size], extraClassName);
}
