import { BRACKET_STEP, CARD_HEIGHT, CARD_WIDTH, PARTNER_PITCH, type Point } from './geometry';
import type { ChartEdge } from './types';

export interface CardPosition {
  readonly key: string;
  readonly centre: Point;
}

export interface ParentageEdgeRequest {
  readonly sourceKey: string;
  readonly anchor: Point;
  readonly child: CardPosition;
  readonly busLevel: number;
  readonly isDashed: boolean;
}

export function partnershipEdge(left: CardPosition, right: CardPosition): ChartEdge {
  return {
    key: `${left.key}~${right.key}`,
    kind: 'partnership',
    points: [
      { x: left.centre.x + CARD_WIDTH / 2, y: left.centre.y },
      { x: right.centre.x - CARD_WIDTH / 2, y: right.centre.y },
    ],
    isDashed: false,
  };
}

export function bracketPartnershipEdge({ person, partner, level }: { person: CardPosition; partner: CardPosition; level: number }): ChartEdge {
  const startX = person.centre.x + CARD_WIDTH / 4;
  const topY = person.centre.y - CARD_HEIGHT / 2;
  const liftedY = topY - BRACKET_STEP * level;
  const descentX = partner.centre.x - PARTNER_PITCH / 2;
  return {
    key: `${person.key}~${partner.key}`,
    kind: 'partnership',
    points: [
      { x: startX, y: topY },
      { x: startX, y: liftedY },
      { x: descentX, y: liftedY },
      { x: descentX, y: partner.centre.y },
      { x: partner.centre.x - CARD_WIDTH / 2, y: partner.centre.y },
    ],
    isDashed: false,
  };
}

export function parentageEdge({ sourceKey, anchor, child, busLevel, isDashed }: ParentageEdgeRequest): ChartEdge {
  const childTop = { x: child.centre.x, y: child.centre.y - CARD_HEIGHT / 2 };
  return {
    key: `${sourceKey}>${child.key}`,
    kind: 'parentage',
    points: [anchor, { x: anchor.x, y: busLevel }, { x: childTop.x, y: busLevel }, childTop],
    isDashed,
  };
}

export function coupleAnchor(left: Point, right: Point): Point {
  return { x: (left.x + right.x) / 2, y: left.y };
}

export function soloAnchor(parent: Point): Point {
  return { x: parent.x, y: parent.y + CARD_HEIGHT / 2 };
}
