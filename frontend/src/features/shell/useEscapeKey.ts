import { useEffect } from 'react';

export interface EscapeKeyOptions {
  isActive: boolean;
  onEscape: () => void;
}

export function useEscapeKey({ isActive, onEscape }: EscapeKeyOptions): void {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onEscape();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onEscape]);
}
