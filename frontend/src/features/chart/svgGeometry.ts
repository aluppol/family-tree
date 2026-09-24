import type { Point } from './layout/geometry';

export function pathData(points: readonly Point[]): string {
  return points.map((point, position) => `${position === 0 ? 'M' : 'L'}${String(point.x)} ${String(point.y)}`).join(' ');
}

export function translation(point: Point): string {
  return `translate(${String(point.x)} ${String(point.y)})`;
}
