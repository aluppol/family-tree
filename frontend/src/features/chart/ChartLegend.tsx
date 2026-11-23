import type { ReactElement } from 'react';
import { classNames } from '../../design/classNames';
import { useT } from '../../i18n/languageContext';
import { REPEAT_BADGE_RADIUS } from './cardGeometry';
import styles from './ChartView.module.scss';
import { RepeatBadge } from './RepeatBadge';

const BADGE_BOX = REPEAT_BADGE_RADIUS + 2;

export function ChartLegend(): ReactElement {
  const t = useT();
  return (
    <ul className={styles.legend} aria-label={t('chart.legend')}>
      <li className={styles.legendEntry}>
        <LineSample className={styles.parentage} />
        {t('chart.birthParent')}
      </li>
      <li className={styles.legendEntry}>
        <LineSample className={classNames(styles.parentage, styles.dashed)} />
        {t('chart.otherParent')}
      </li>
      <li className={styles.legendEntry}>
        <svg className={styles.badgeSample} viewBox={`${String(-BADGE_BOX)} ${String(-BADGE_BOX)} ${String(2 * BADGE_BOX)} ${String(2 * BADGE_BOX)}`} aria-hidden="true">
          <RepeatBadge centre={{ x: 0, y: 0 }} />
        </svg>
        {t('chart.repeated')}
      </li>
    </ul>
  );
}

function LineSample({ className }: { className?: string }): ReactElement {
  return (
    <svg className={styles.lineSample} viewBox="0 0 32 8" aria-hidden="true">
      <path className={classNames(styles.edge, className)} d="M0 4H32" />
    </svg>
  );
}
