import type { AnchorHTMLAttributes, KeyboardEvent, MouseEvent, ReactElement } from 'react';

export interface NodeLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick' | 'onKeyDown'> {
  href: string;
  label: string;
  onNavigate: (href: string) => void;
}

const ACTIVATION_KEYS = new Set(['Enter', ' ']);

export function NodeLink({ href, label, onNavigate, children, ...anchorProps }: NodeLinkProps): ReactElement {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (isPlainClick(event)) {
      event.preventDefault();
      onNavigate(href);
    }
  }
  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>): void {
    if (ACTIVATION_KEYS.has(event.key)) {
      event.preventDefault();
      onNavigate(href);
    }
  }
  return (
    <a href={href} aria-label={label} onClick={handleClick} onKeyDown={handleKeyDown} {...anchorProps}>
      {children}
    </a>
  );
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
