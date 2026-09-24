import type { FocusEvent, ReactElement } from 'react';
import type { PersonSummary } from '../../api/types';
import { classNames } from '../../design/classNames';
import { fullName } from '../people/personName';
import type { CardClipIds } from './CardClipPaths';
import {
  ACCENT_WIDTH,
  CARD_CORNER_RADIUS,
  CENTRE_CONTROL_CENTRE,
  CENTRE_CONTROL_RADIUS,
  clipUrl,
  FOCUS_RING_INSET,
  lineCentreY,
  REPEAT_BADGE_CENTRE,
  TEXT_LEFT,
} from './cardGeometry';
import { cardLines, personLabel } from './cardText';
import styles from './ChartView.module.scss';
import { CARD_HEIGHT, CARD_WIDTH, type Point } from './layout/geometry';
import type { ChartNode } from './layout/types';
import { NodeAvatar } from './NodeAvatar';
import { NodeLink } from './NodeLink';
import { RepeatBadge } from './RepeatBadge';
import { translation } from './svgGeometry';

export interface ChartLinks {
  readonly profile: (personId: number) => string;
  readonly tree: (personId: number) => string;
}

export interface PersonNodeProps {
  readonly node: ChartNode;
  readonly links: ChartLinks;
  readonly clipIds: CardClipIds;
  readonly onNavigate: (href: string) => void;
  readonly onReveal: (centre: Point) => void;
}

const CROSSHAIR = 'M0-8.5v3M0 5.5v3M-8.5 0h3M5.5 0h3M0-4a4 4 0 1 0 0 8 4 4 0 1 0 0-8z';

export function PersonNode({ node, links, clipIds, onNavigate, onReveal }: PersonNodeProps): ReactElement {
  function handleFocus(event: FocusEvent<SVGGElement>): void {
    if (event.target.matches(':focus-visible')) {
      onReveal(node);
    }
  }
  return (
    <g transform={translation({ x: node.x - CARD_WIDTH / 2, y: node.y - CARD_HEIGHT / 2 })} className={nodeClassName(node)} onFocus={handleFocus}>
      <NodeLink
        href={links.profile(node.person.id)}
        label={personLabel(node)}
        className={styles.cardLink}
        aria-current={node.isFocus ? 'true' : undefined}
        onNavigate={onNavigate}
      >
        <title>{fullName(node.person)}</title>
        <CardFace node={node} clipIds={clipIds} />
      </NodeLink>
      {!node.isFocus && <CentreControl person={node.person} href={links.tree(node.person.id)} onNavigate={onNavigate} />}
    </g>
  );
}

function CardFace({ node, clipIds }: { node: ChartNode; clipIds: CardClipIds }): ReactElement {
  const inset = FOCUS_RING_INSET;
  return (
    <>
      <rect className={styles.focusRing} x={-inset} y={-inset} width={CARD_WIDTH + 2 * inset} height={CARD_HEIGHT + 2 * inset} rx={CARD_CORNER_RADIUS + inset} />
      <rect className={styles.card} width={CARD_WIDTH} height={CARD_HEIGHT} rx={CARD_CORNER_RADIUS} />
      <rect className={styles.accent} width={ACCENT_WIDTH} height={CARD_HEIGHT} clipPath={clipUrl(clipIds.card)} />
      <NodeAvatar person={node.person} clipId={clipIds.avatar} />
      {node.isRepeat && <RepeatBadge centre={REPEAT_BADGE_CENTRE} />}
      <CardText person={node.person} clipId={clipIds.text} />
    </>
  );
}

function CardText({ person, clipId }: { person: PersonSummary; clipId: string }): ReactElement {
  const lines = cardLines(person);
  return (
    <g clipPath={clipUrl(clipId)}>
      {lines.map((line, position) => (
        <text key={`${line.tone}-${String(position)}`} className={styles[line.tone]} x={TEXT_LEFT} y={lineCentreY(position, lines.length)} dominantBaseline="central">
          {line.text}
        </text>
      ))}
    </g>
  );
}

function CentreControl({ person, href, onNavigate }: { person: PersonSummary; href: string; onNavigate: (href: string) => void }): ReactElement {
  const label = `Centre the tree on ${fullName(person)}`;
  return (
    <NodeLink href={href} label={label} className={styles.centreLink} onNavigate={onNavigate}>
      <title>{label}</title>
      <g transform={translation(CENTRE_CONTROL_CENTRE)}>
        <circle className={styles.centreFocusRing} r={CENTRE_CONTROL_RADIUS + FOCUS_RING_INSET} />
        <circle className={styles.centreButton} r={CENTRE_CONTROL_RADIUS} />
        <path className={styles.centreGlyph} d={CROSSHAIR} />
      </g>
    </NodeLink>
  );
}

function nodeClassName(node: ChartNode): string {
  return classNames(styles[node.person.sex], node.isFocus && styles.isFocus, node.isRepeat && styles.isRepeat);
}
