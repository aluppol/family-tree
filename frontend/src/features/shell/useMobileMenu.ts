import { type RefObject, useRef, useState } from 'react';
import type { MenuState } from './SiteHeader';
import { useEscapeKey } from './useEscapeKey';

export interface MobileMenu {
  menu: MenuState;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

export function useMobileMenu(pathname: string): MobileMenu {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [openedAtPathname, setOpenedAtPathname] = useState<string | null>(null);
  const isOpen = openedAtPathname === pathname;
  function handleToggle(): void {
    setOpenedAtPathname(isOpen ? null : pathname);
  }
  function handleClose(): void {
    setOpenedAtPathname(null);
  }
  function handleEscape(): void {
    handleClose();
    menuButtonRef.current?.focus();
  }
  useEscapeKey({ isActive: isOpen, onEscape: handleEscape });
  return { menu: { pathname, isOpen, onToggle: handleToggle, onNavigate: handleClose }, menuButtonRef };
}
