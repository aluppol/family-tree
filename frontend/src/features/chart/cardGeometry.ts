import { CARD_HEIGHT, CARD_WIDTH, type Point } from './layout/geometry';

export const CARD_CORNER_RADIUS = 10;
export const ACCENT_WIDTH = 5;
export const FOCUS_RING_INSET = 4;

export const AVATAR_CENTRE: Point = { x: 32, y: CARD_HEIGHT / 2 };
export const AVATAR_RADIUS = 18;

export const TEXT_LEFT = 60;
export const TEXT_WIDTH = CARD_WIDTH - TEXT_LEFT - 40;

export const CENTRE_CONTROL_CENTRE: Point = { x: CARD_WIDTH - 22, y: CARD_HEIGHT / 2 };
export const CENTRE_CONTROL_RADIUS = 12;

export const REPEAT_BADGE_CENTRE: Point = { x: AVATAR_CENTRE.x + 15, y: AVATAR_CENTRE.y + 15 };
export const REPEAT_BADGE_RADIUS = 8;

const LINE_HEIGHT = 17;

export function lineCentreY(position: number, lineCount: number): number {
  return CARD_HEIGHT / 2 + (position - (lineCount - 1) / 2) * LINE_HEIGHT;
}

export function clipUrl(clipId: string): string {
  return `url(#${clipId})`;
}
