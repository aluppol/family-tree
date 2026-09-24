import { type RefObject, useEffect, useRef } from 'react';

export function useFocusOnNavigation(pathname: string, target: RefObject<HTMLElement | null>): void {
  const focusedPathname = useRef(pathname);
  useEffect(() => {
    if (focusedPathname.current !== pathname) {
      focusedPathname.current = pathname;
      target.current?.focus({ preventScroll: true });
    }
  }, [pathname, target]);
}
