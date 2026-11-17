import type { ReactElement } from 'react';
import type { PersonSummary } from '../../api/types';
import type { NodeTone } from './layout/towerTypes';
import { shortName } from './towerText';
import styles from './TowerPage.module.scss';

export function ToneSwatch({ tone, isHollow = false }: { tone: NodeTone; isHollow?: boolean }): ReactElement {
  return <span className={styles.swatch} data-tone={toneKey(tone)} data-hollow={isHollow} aria-hidden="true" />;
}

export function toneName(tone: NodeTone, lineHead: PersonSummary | undefined): string {
  switch (tone.kind) {
    case 'line':
      return lineHead === undefined ? 'Family line' : `Line of ${shortName(lineHead)}`;
    case 'trunk':
      return 'Common ancestors';
    case 'married-in':
      return 'Married into the family';
    case 'other':
      return 'Other branches';
  }
}

function toneKey(tone: NodeTone): string {
  return tone.kind === 'line' ? `line-${String(tone.lineIndex + 1)}` : tone.kind;
}
