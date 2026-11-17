import type { TowerPoint } from '../layout/towerTypes';

export interface CameraPose {
  readonly target: TowerPoint;
  readonly position: TowerPoint;
}

export interface CameraMove {
  readonly startedAt: number;
  readonly durationMs: number;
  readonly from: CameraPose;
  readonly to: CameraPose;
}

export interface Viewport {
  readonly aspect: number;
  readonly verticalFieldOfView: number;
}

export interface Extent {
  readonly centre: TowerPoint;
  readonly radius: number;
  readonly halfHeight: number;
}

export type Preset = 'overview' | 'side' | 'top';

export const FLIGHT_MS = 950;
export const NEIGHBOURHOOD_RADIUS = 4.5;

const FIT_MARGIN = 1.08;
const SMALLEST_EXTENT = 1;
const OVERVIEW_DIRECTION: TowerPoint = { x: 0.55, y: 0.32, z: 1 };
const SIDE_DIRECTION: TowerPoint = { x: 0, y: 0.04, z: 1 };
const TOP_DIRECTION: TowerPoint = { x: 0, y: 1, z: 0.0001 };
const LOWEST_ELEVATION = 0.12;
const HIGHEST_ELEVATION = 0.6;

export function easeInOut(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

export function poseAt(move: CameraMove, now: number): CameraPose {
  const eased = easeInOut(progressOf(move, now));
  return { target: mix(move.from.target, move.to.target, eased), position: mix(move.from.position, move.to.position, eased) };
}

export function isMoveFinished(move: CameraMove, now: number): boolean {
  return progressOf(move, now) >= 1;
}

export function fittingDistance(preset: Preset, extent: Extent, viewport: Viewport): number {
  const { halfVertical, halfHorizontal } = halfAnglesOf(viewport);
  const radius = Math.max(extent.radius, SMALLEST_EXTENT);
  if (preset === 'top') {
    return (radius / Math.tan(Math.min(halfVertical, halfHorizontal))) * FIT_MARGIN + extent.halfHeight;
  }
  const height = Math.max(extent.halfHeight, SMALLEST_EXTENT);
  return Math.max(height / Math.tan(halfVertical), radius / Math.tan(halfHorizontal)) * FIT_MARGIN + radius;
}

export function presetPose(preset: Preset, extent: Extent, viewport: Viewport): CameraPose {
  const direction = { overview: OVERVIEW_DIRECTION, side: SIDE_DIRECTION, top: TOP_DIRECTION }[preset];
  return { target: extent.centre, position: along(extent.centre, direction, fittingDistance(preset, extent, viewport)) };
}

export function personPose(personPoint: TowerPoint, current: CameraPose, viewport: Viewport): CameraPose {
  const offset = subtract(current.position, current.target);
  const flat = Math.hypot(offset.x, offset.z) || 1;
  const elevation = Math.min(HIGHEST_ELEVATION, Math.max(LOWEST_ELEVATION, offset.y / Math.hypot(flat, offset.y)));
  const direction = { x: (offset.x / flat) * Math.sqrt(1 - elevation ** 2), y: elevation, z: (offset.z / flat) * Math.sqrt(1 - elevation ** 2) };
  const { halfVertical, halfHorizontal } = halfAnglesOf(viewport);
  const distance = NEIGHBOURHOOD_RADIUS / Math.tan(Math.min(halfVertical, halfHorizontal));
  return { target: personPoint, position: along(personPoint, direction, distance) };
}

function halfAnglesOf(viewport: Viewport): { halfVertical: number; halfHorizontal: number } {
  const halfVertical = (viewport.verticalFieldOfView * Math.PI) / 360;
  return { halfVertical, halfHorizontal: Math.atan(Math.tan(halfVertical) * viewport.aspect) };
}

function progressOf(move: CameraMove, now: number): number {
  return move.durationMs <= 0 ? 1 : Math.min(1, Math.max(0, (now - move.startedAt) / move.durationMs));
}

function mix(from: TowerPoint, to: TowerPoint, amount: number): TowerPoint {
  return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount, z: from.z + (to.z - from.z) * amount };
}

function subtract(from: TowerPoint, to: TowerPoint): TowerPoint {
  return { x: from.x - to.x, y: from.y - to.y, z: from.z - to.z };
}

function along(origin: TowerPoint, direction: TowerPoint, distance: number): TowerPoint {
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const scale = distance / length;
  return { x: origin.x + direction.x * scale, y: origin.y + direction.y * scale, z: origin.z + direction.z * scale };
}
