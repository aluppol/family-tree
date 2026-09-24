import type { ReactElement } from 'react';
import { REPEAT_BADGE_RADIUS } from './cardGeometry';
import styles from './ChartView.module.scss';
import type { Point } from './layout/geometry';
import { translation } from './svgGeometry';

const LOOP_ARROWS = 'M-3.6 1.2A3.8 3.8 0 0 1 2.6-2.8M0.6-4.6 2.6-2.8 0.4-1.2M3.6-1.2A3.8 3.8 0 0 1-2.6 2.8M-0.6 4.6-2.6 2.8-0.4 1.2';

export function RepeatBadge({ centre }: { centre: Point }): ReactElement {
  return (
    <g className={styles.repeatBadge} transform={translation(centre)} aria-hidden="true">
      <circle r={REPEAT_BADGE_RADIUS} />
      <path d={LOOP_ARROWS} />
    </g>
  );
}
