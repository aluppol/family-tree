import { CARD_HEIGHT, CARD_WIDTH, type Point } from './layout/geometry';
import type { ChartBounds } from './layout/types';

export interface ViewTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export const READABLE_SCALE = 0.75;
export const LARGEST_SCALE = 2.5;

const SMALLEST_SCALE = 0.02;
const ZOOMED_OUT_SCALE = 0.2;
const FIT_PADDING = 24;

export function fittedView(bounds: ChartBounds, viewport: Viewport): ViewTransform {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const fittingScale = Math.min((viewport.width - 2 * FIT_PADDING) / width, (viewport.height - 2 * FIT_PADDING) / height);
  const scale = Math.min(Math.max(fittingScale, SMALLEST_SCALE), 1);
  return centredView({ point: { x: bounds.minX + width / 2, y: bounds.minY + height / 2 }, viewport, scale });
}

export function openingView({ bounds, focus, viewport }: { bounds: ChartBounds; focus: Point; viewport: Viewport }): ViewTransform {
  const fitted = fittedView(bounds, viewport);
  return fitted.scale >= READABLE_SCALE ? fitted : centredView({ point: focus, viewport, scale: READABLE_SCALE });
}

export function centredView({ point, viewport, scale }: { point: Point; viewport: Viewport; scale: number }): ViewTransform {
  return { x: viewport.width / 2 - scale * point.x, y: viewport.height / 2 - scale * point.y, scale };
}

export function scaleLimits(bounds: ChartBounds, viewport: Viewport): [number, number] {
  return [Math.min(ZOOMED_OUT_SCALE, fittedView(bounds, viewport).scale), LARGEST_SCALE];
}

export function showsWholeCard({ view, viewport, centre }: { view: ViewTransform; viewport: Viewport; centre: Point }): boolean {
  const screenX = view.x + view.scale * centre.x;
  const screenY = view.y + view.scale * centre.y;
  const halfWidth = (view.scale * CARD_WIDTH) / 2;
  const halfHeight = (view.scale * CARD_HEIGHT) / 2;
  const fitsAcross = screenX - halfWidth >= 0 && screenX + halfWidth <= viewport.width;
  return fitsAcross && screenY - halfHeight >= 0 && screenY + halfHeight <= viewport.height;
}
