import { memo, type ReactElement } from 'react';
import { classNames } from '../../design/classNames';
import type { CardClipIds } from './CardClipPaths';
import styles from './ChartView.module.scss';
import type { Point } from './layout/geometry';
import type { ChartEdge, HourglassLayout } from './layout/types';
import { type ChartLinks, PersonNode } from './PersonNode';
import { pathData } from './svgGeometry';

export interface ChartSceneProps {
  readonly layout: HourglassLayout;
  readonly links: ChartLinks;
  readonly clipIds: CardClipIds;
  readonly onNavigate: (href: string) => void;
  readonly onReveal: (centre: Point) => void;
}

export const ChartScene = memo(function ChartScene({ layout, links, clipIds, onNavigate, onReveal }: ChartSceneProps): ReactElement {
  return (
    <>
      <g aria-hidden="true">
        {layout.edges.map((edge) => (
          <path key={edge.key} className={edgeClassName(edge)} d={pathData(edge.points)} />
        ))}
      </g>
      {layout.nodes.map((node) => (
        <PersonNode key={node.key} node={node} links={links} clipIds={clipIds} onNavigate={onNavigate} onReveal={onReveal} />
      ))}
    </>
  );
});

function edgeClassName(edge: ChartEdge): string {
  return classNames(styles.edge, styles[edge.kind], edge.isDashed && styles.dashed);
}
