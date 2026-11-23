import type { ReactElement } from 'react';
import type { PersonSummary } from '../../api/types';
import type { Translate } from '../../i18n/translate';
import type { NodeTone } from './layout/towerTypes';
import { shortName } from './towerText';
import styles from './TowerPage.module.scss';

export function ToneSwatch({ tone, isHollow = false }: { tone: NodeTone; isHollow?: boolean }): ReactElement {
  return <span className={styles.swatch} data-tone={toneKey(tone)} data-hollow={isHollow} aria-hidden="true" />;
}

export function toneName(t: Translate, tone: NodeTone, lineHead: PersonSummary | undefined): string {
  switch (tone.kind) {
    case 'line':
      return lineHead === undefined ? t('tower.familyLine') : t('tower.lineOf', { name: shortName(t, lineHead) });
    case 'trunk':
      return t('tower.commonAncestors');
    case 'married-in':
      return t('tower.marriedIn');
    case 'other':
      return t('tower.otherBranches');
  }
}

function toneKey(tone: NodeTone): string {
  return tone.kind === 'line' ? `line-${String(tone.lineIndex + 1)}` : tone.kind;
}
