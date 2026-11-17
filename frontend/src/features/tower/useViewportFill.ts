import { type RefObject, useLayoutEffect } from 'react';

export const TOP_OFFSET_PROPERTY = '--tower-top';

export function useViewportFill(elementRef: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element === null) {
      return undefined;
    }
    const measure = (): void => {
      element.style.setProperty(TOP_OFFSET_PROPERTY, `${String(Math.round(element.getBoundingClientRect().top + window.scrollY))}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [elementRef]);
}
