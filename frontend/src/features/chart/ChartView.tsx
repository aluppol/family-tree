import { type ReactElement, useId, useRef } from 'react';
import { useT } from '../../i18n/languageContext';
import { CardClipPaths, useCardClipIds } from './CardClipPaths';
import { ChartLegend } from './ChartLegend';
import { ChartScene } from './ChartScene';
import styles from './ChartView.module.scss';
import type { Point } from './layout/geometry';
import type { HourglassLayout } from './layout/types';
import type { ChartLinks } from './PersonNode';
import { useChartZoom } from './useChartZoom';
import { ZoomControls } from './ZoomControls';

export interface ChartViewProps {
  readonly layout: HourglassLayout;
  readonly label: string;
  readonly links: ChartLinks;
  readonly onNavigate: (href: string) => void;
}

const ORIGIN: Point = { x: 0, y: 0 };

export function ChartView({ layout, label, links, onNavigate }: ChartViewProps): ReactElement {
  const t = useT();
  const canvasRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const clipIds = useCardClipIds();
  const instructionsId = useId();
  const focus = layout.nodes.find((node) => node.isFocus) ?? ORIGIN;
  const zoom = useChartZoom({ canvasRef, sceneRef, bounds: layout.bounds, focus });
  return (
    <div className={styles.chart}>
      <div className={styles.frame}>
        <ZoomControls onZoomIn={zoom.zoomIn} onZoomOut={zoom.zoomOut} onFit={zoom.fitToView} />
        <svg ref={canvasRef} className={styles.canvas} role="group" aria-label={label} aria-describedby={instructionsId}>
          <CardClipPaths ids={clipIds} />
          <g ref={sceneRef}>
            <ChartScene layout={layout} links={links} clipIds={clipIds} onNavigate={onNavigate} onReveal={zoom.reveal} />
          </g>
        </svg>
      </div>
      <p id={instructionsId} className="visually-hidden">
        {t('chart.instructions')}
      </p>
      <ChartLegend />
    </div>
  );
}
