import { type ReactElement, useId } from 'react';
import { Icon } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import type { NodeTone, TowerAxis, TowerLegend } from './layout/towerTypes';
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
  const t = useT();
  const listId = useId();
  return (
    <section className={styles.key} aria-label={t('tower.key')} data-open={isOpen}>
      <button type="button" className={styles.overlayButton} aria-expanded={isOpen} aria-controls={listId} onClick={onToggle}>
        <Icon name="info" />
        {t('tower.key')}
        <Icon name={isOpen ? 'chevronLeft' : 'chevronRight'} />
      </button>
      <ul id={listId} className={styles.keyList} inert={!isOpen}>
        <li>{axis === 'years' ? t('tower.yearsAxis') : t('tower.generationsAxis')}</li>
        {legend.lines.map((line) => (
          <li key={line.lineIndex}>
            <ToneSwatch tone={{ kind: 'line', lineIndex: line.lineIndex }} />
            {toneName(t, { kind: 'line', lineIndex: line.lineIndex }, line.head)}
          </li>
        ))}
        <KeyExtras legend={legend} hasMarriages={hasMarriages} />
      </ul>
    </section>
  );
}

function KeyExtras({ legend, hasMarriages }: { legend: TowerLegend; hasMarriages: boolean }): ReactElement {
  const t = useT();
  return (
    <>
      {legend.hasTrunk && <ToneItem tone={{ kind: 'trunk' }} />}
      {legend.hasMarriedIn && <ToneItem tone={{ kind: 'married-in' }} />}
      {legend.hasOtherLines && <ToneItem tone={{ kind: 'other' }} />}
      {hasMarriages && (
        <li>
          <span className={styles.goldSample} aria-hidden="true" />
          {t('tower.marriageAndPath')}
        </li>
      )}
      {legend.hasEstimatedYears && (
        <li>
          <ToneSwatch tone={{ kind: 'other' }} isHollow />
          {t('tower.estimatedYear')}
        </li>
      )}
      {legend.hasRepeats && (
        <li>
          {REPEAT_MARK} {t('tower.relatedParents')}
        </li>
      )}
    </>
  );
}

function ToneItem({ tone }: { tone: NodeTone }): ReactElement {
  const t = useT();
  return (
    <li>
      <ToneSwatch tone={tone} />
      {toneName(t, tone, undefined)}
    </li>
  );
}
