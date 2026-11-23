import type { ReactElement } from 'react';
import { Button, Icon, IconButton } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import styles from './ChartView.module.scss';

export interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onFit }: ZoomControlsProps): ReactElement {
  const t = useT();
  return (
    <div className={styles.zoomControls} role="group" aria-label={t('chart.zoom')}>
      <IconButton label={t('chart.zoomIn')} icon={<Icon name="plus" />} size="small" onClick={onZoomIn} />
      <IconButton label={t('chart.zoomOut')} icon={<Icon name="minus" />} size="small" onClick={onZoomOut} />
      <Button size="small" aria-label={t('chart.fitLabel')} onClick={onFit}>
        {t('chart.fit')}
      </Button>
    </div>
  );
}
