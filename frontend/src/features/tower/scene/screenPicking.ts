export interface ScreenPoint {
  readonly personId: number;
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

export interface Pointer {
  readonly x: number;
  readonly y: number;
}

export const TAP_RADIUS = 28;
export const TAP_SLOP = 8;
export const TAP_MAX_MS = 600;

const TIE_DISTANCE = 4;

export function nearestPerson(points: readonly ScreenPoint[], pointer: Pointer, radius: number): number | null {
  const reachable = points
    .filter((point) => point.depth >= -1 && point.depth <= 1)
    .map((point) => ({ point, distance: Math.hypot(point.x - pointer.x, point.y - pointer.y) }))
    .filter(({ distance }) => distance <= radius);
  const [best] = reachable.sort((first, second) => {
    const isTie = Math.abs(first.distance - second.distance) <= TIE_DISTANCE;
    return isTie ? first.point.depth - second.point.depth : first.distance - second.distance;
  });
  return best === undefined ? null : best.point.personId;
}

export function isTap(down: Pointer & { readonly time: number }, up: Pointer & { readonly time: number }): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= TAP_SLOP && up.time - down.time <= TAP_MAX_MS;
}
