import { type ReactElement, useId } from 'react';
import { Icon } from '../../design/components';
import type { TowerAxis, TowerLegend } from './layout/towerTypes';
import { ToneSwatch, toneName } from './ToneSwatch';
import { REPEAT_MARK } from './towerText';
import styles from './TowerPage.module.scss';

export interface TowerKeyProps {
  axis: TowerAxis;
  legend: TowerLegend;
  hasMarriages: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function TowerKey({ axis, legend, hasMarriages, isOpen, onToggle }: TowerKeyProps): ReactElement {
  const listId = useId();
  return (
    <section className={styles.key} aria-label="Key" data-open={isOpen}>
      <button type="button" className={styles.overlayButton} aria-expanded={isOpen} aria-controls={listId} onClick={onToggle}>
        <Icon name="info" />
        Key
        <Icon name={isOpen ? 'chevronLeft' : 'chevronRight'} />
      </button>
      <ul id={listId} className={styles.keyList} inert={!isOpen}>
        <li>{axis === 'years' ? 'Height is the year of birth; rings mark decades, the oldest at the bottom.' : 'Each ring is one generation, the oldest at the bottom.'}</li>
        {legend.lines.map((line) => (
          <li key={line.lineIndex}>
            <ToneSwatch tone={{ kind: 'line', lineIndex: line.lineIndex }} />
            {toneName({ kind: 'line', lineIndex: line.lineIndex }, line.head)}
          </li>
        ))}
        <KeyExtras legend={legend} hasMarriages={hasMarriages} />
      </ul>
    </section>
  );
}

function KeyExtras({ legend, hasMarriages }: { legend: TowerLegend; hasMarriages: boolean }): ReactElement {
  return (
    <>
      {legend.hasTrunk && <ToneItem tone={{ kind: 'trunk' }} />}
      {legend.hasMarriedIn && <ToneItem tone={{ kind: 'married-in' }} />}
      {legend.hasOtherLines && <ToneItem tone={{ kind: 'other' }} />}
      {hasMarriages && (
        <li>
          <span className={styles.goldSample} aria-hidden="true" />
          Marriage, and the path you ask for
        </li>
      )}
      {legend.hasEstimatedYears && (
        <li>
          <ToneSwatch tone={{ kind: 'other' }} isHollow />
          Birth year estimated
        </li>
      )}
      {legend.hasRepeats && <li>{REPEAT_MARK} Parents are related to each other</li>}
    </>
  );
}

function ToneItem({ tone }: { tone: Parameters<typeof toneName>[0] }): ReactElement {
  return (
    <li>
      <ToneSwatch tone={tone} />
      {toneName(tone, undefined)}
    </li>
  );
}
