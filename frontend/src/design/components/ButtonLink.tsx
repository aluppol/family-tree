import type { AnchorHTMLAttributes, ReactElement } from 'react';
import { Link, type LinkProps } from 'react-router';
import { type ButtonAppearance, buttonClassName } from './buttonClassName';

export interface ButtonLinkProps extends LinkProps, ButtonAppearance {}

export function ButtonLink({ variant, size, className, ...linkProps }: ButtonLinkProps): ReactElement {
  return <Link className={buttonClassName({ variant, size }, className)} {...linkProps} />;
}

export interface ButtonAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement>, ButtonAppearance {
  href: string;
}

export function ButtonAnchor({ variant, size, className, children, ...anchorProps }: ButtonAnchorProps): ReactElement {
  return (
    <a className={buttonClassName({ variant, size }, className)} {...anchorProps}>
      {children}
    </a>
  );
}
