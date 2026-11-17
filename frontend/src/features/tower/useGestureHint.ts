import { useCallback, useState } from 'react';

export const GESTURE_HINT_KEY = 'family-tree.tower-gesture-hint-seen';

const SEEN = 'yes';

export interface GestureHint {
  isVisible: boolean;
  dismiss: () => void;
}

export function useGestureHint(): GestureHint {
  const [isVisible, setVisible] = useState(() => !wasHintSeen());
  const dismiss = useCallback(() => {
    setVisible(false);
    rememberHintSeen();
  }, []);
  return { isVisible, dismiss };
}

function wasHintSeen(): boolean {
  try {
    return window.localStorage.getItem(GESTURE_HINT_KEY) === SEEN;
  } catch {
    return false;
  }
}

function rememberHintSeen(): void {
  try {
    window.localStorage.setItem(GESTURE_HINT_KEY, SEEN);
  } catch {
    return;
  }
}
