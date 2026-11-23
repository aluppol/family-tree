import { type PointerEvent, type ReactElement, type ReactNode, useId, useRef } from 'react';
import { Icon } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import styles from './TowerPage.module.scss';

export interface BottomSheetProps {
  title: string;
  summary: string;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  children: ReactNode;
}

interface SwipeHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  wasSwipe: () => boolean;
}

const SWIPE_DISTANCE = 30;

export function BottomSheet({ title, summary, isExpanded, onExpandedChange, children }: BottomSheetProps): ReactElement {
  const t = useT();
  const bodyId = useId();
  const swipe = useVerticalSwipe(onExpandedChange);
  function handleClick(): void {
    if (!swipe.wasSwipe()) {
      onExpandedChange(!isExpanded);
    }
  }
  return (
    <section className={styles.sheet} data-expanded={isExpanded} aria-label={t('tower.selectedPerson')}>
      <button type="button" className={styles.sheetHandle} aria-expanded={isExpanded} aria-controls={bodyId} onClick={handleClick} onPointerDown={swipe.onPointerDown} onPointerUp={swipe.onPointerUp}>
        <span className={styles.sheetGrip} aria-hidden="true" />
        <span className={styles.sheetTitle}>{title}</span>
        <span className={styles.sheetSummary}>{summary}</span>
        <span className={styles.sheetMore}>
          {isExpanded ? t('tower.sheetHide') : t('tower.sheetShow')}
          <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} />
        </span>
      </button>
      <div id={bodyId} className={styles.sheetBody} hidden={!isExpanded}>
        {children}
      </div>
    </section>
  );
}

function useVerticalSwipe(onExpandedChange: (isExpanded: boolean) => void): SwipeHandlers {
  const startRef = useRef<number | null>(null);
  const swipedRef = useRef(false);
  return {
    onPointerDown: (event) => {
      startRef.current = event.clientY;
      swipedRef.current = false;
    },
    onPointerUp: (event) => {
      const travel = event.clientY - (startRef.current ?? event.clientY);
      startRef.current = null;
      swipedRef.current = Math.abs(travel) >= SWIPE_DISTANCE;
      if (swipedRef.current) {
        onExpandedChange(travel < 0);
      }
    },
    wasSwipe: () => swipedRef.current,
  };
}
