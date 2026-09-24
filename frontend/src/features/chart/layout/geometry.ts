export interface Point {
  readonly x: number;
  readonly y: number;
}

export const CARD_WIDTH = 216;
export const CARD_HEIGHT = 72;
export const COUPLE_GAP = 24;
export const SIBLING_GAP = 28;
export const FAMILY_GAP = 48;
export const GENERATION_GAP = 72;
export const BRACKET_STEP = 8;

export const PARTNER_PITCH = CARD_WIDTH + COUPLE_GAP;

const ROW_PITCH = CARD_HEIGHT + GENERATION_GAP;

export function rowCentreY(generation: number): number {
  return generation * ROW_PITCH;
}

export function rowBottomY(generation: number): number {
  return rowCentreY(generation) + CARD_HEIGHT / 2;
}

export interface GridPosition {
  readonly x: number;
  readonly generation: number;
}

export interface BusLane {
  readonly generation: number;
  readonly index: number;
  readonly count: number;
}

export function centreOf(position: GridPosition): Point {
  return { x: position.x, y: rowCentreY(position.generation) };
}

export function busY(lane: BusLane): number {
  return rowBottomY(lane.generation) + (GENERATION_GAP * (lane.index + 1)) / (lane.count + 1);
}
