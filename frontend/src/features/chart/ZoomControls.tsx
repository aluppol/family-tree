import type { ReactElement } from 'react';
import { Button, Icon, IconButton } from '../../design/components';
import styles from './ChartView.module.scss';

export interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onFit }: ZoomControlsProps): ReactElement {
  return (
    <div className={styles.zoomControls} role="group" aria-label="Zoom">
      <IconButton label="Zoom in" icon={<Icon name="plus" />} size="small" onClick={onZoomIn} />
      <IconButton label="Zoom out" icon={<Icon name="minus" />} size="small" onClick={onZoomOut} />
      <Button size="small" aria-label="Fit the tree to the screen" onClick={onFit}>
        Fit
      </Button>
    </div>
  );
}
