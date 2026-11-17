import { expect, test } from 'vitest';
import { type CameraMove, NEIGHBOURHOOD_RADIUS, easeInOut, fittingDistance, isMoveFinished, personPose, poseAt, presetPose } from './cameraMath';
import { TAP_RADIUS, isTap, nearestPerson } from './screenPicking';

const ORIGIN = { x: 0, y: 0, z: 0 };
const MOVE: CameraMove = { startedAt: 100, durationMs: 1000, from: { target: ORIGIN, position: { x: 0, y: 0, z: 10 } }, to: { target: { x: 10, y: 0, z: 0 }, position: { x: 10, y: 0, z: 20 } } };

test('the flight eases in and out and ends exactly at the destination', () => {
  expect([0, 0.25, 0.5, 0.75, 1].map(easeInOut)).toEqual([0, 0.0625, 0.5, 0.9375, 1]);
  expect(poseAt(MOVE, 600).target.x).toBeCloseTo(5);
  expect(poseAt(MOVE, 5000)).toEqual(MOVE.to);
  expect([isMoveFinished(MOVE, 600), isMoveFinished(MOVE, 1100)]).toEqual([false, true]);
});

test('a flight without duration finishes at once', () => {
  expect(poseAt({ ...MOVE, durationMs: 0 }, 0)).toEqual(MOVE.to);
});

test('the tower fits the narrower side of the screen', () => {
  const extent = { centre: ORIGIN, radius: 10, halfHeight: 5 };
  const wide = fittingDistance('side', extent, { aspect: 2, verticalFieldOfView: 45 });
  const tall = fittingDistance('side', extent, { aspect: 0.5, verticalFieldOfView: 45 });
  const halfAngle = (22.5 * Math.PI) / 180;
  expect(tall).toBeGreaterThan(wide);
  expect(wide).toBeCloseTo((5 / Math.tan(halfAngle)) * 1.08 + 10);
  expect(fittingDistance('top', extent, { aspect: 1, verticalFieldOfView: 45 })).toBeCloseTo((10 / Math.tan(halfAngle)) * 1.08 + 5);
});

test('the presets look from the front, the side and the top at the centre', () => {
  const extent = { centre: { x: 1, y: 2, z: 3 }, radius: 5, halfHeight: 4 };
  const viewport = { aspect: 1, verticalFieldOfView: 45 };
  expect(presetPose('top', extent, viewport).position.y).toBeGreaterThan(extent.centre.y + 10);
  expect(presetPose('side', extent, viewport).position.x).toBeCloseTo(1);
  expect(presetPose('overview', extent, viewport).target).toEqual(extent.centre);
});

test('flying to a person keeps the viewing direction but not from below or straight above', () => {
  const square = { aspect: 1, verticalFieldOfView: 45 };
  const fromBelow = personPose({ x: 2, y: 3, z: 4 }, { target: ORIGIN, position: { x: 0, y: -10, z: 1 } }, square);
  const offset = { x: fromBelow.position.x - 2, y: fromBelow.position.y - 3, z: fromBelow.position.z - 4 };
  expect(Math.hypot(offset.x, offset.y, offset.z)).toBeCloseTo(NEIGHBOURHOOD_RADIUS / Math.tan((22.5 * Math.PI) / 180));
  expect(offset.y).toBeGreaterThan(0);
  expect(fromBelow.target).toEqual({ x: 2, y: 3, z: 4 });
  const fromAbove = personPose(ORIGIN, { target: ORIGIN, position: { x: 0, y: 30, z: 0.1 } }, square);
  expect(fromAbove.position.y / Math.hypot(fromAbove.position.x, fromAbove.position.y, fromAbove.position.z)).toBeCloseTo(0.6);
});

test('a narrow phone screen flies further back so the relatives fit across', () => {
  const current = { target: ORIGIN, position: { x: 0, y: 2, z: 10 } };
  const phone = personPose(ORIGIN, current, { aspect: 0.6, verticalFieldOfView: 45 });
  const desktop = personPose(ORIGIN, current, { aspect: 1.6, verticalFieldOfView: 45 });
  expect(Math.hypot(phone.position.x, phone.position.y, phone.position.z)).toBeGreaterThan(Math.hypot(desktop.position.x, desktop.position.y, desktop.position.z));
});

test('a tap picks the nearest person within reach, the closer one on a tie', () => {
  const points = [
    { personId: 1, x: 100, y: 100, depth: 0.5 },
    { personId: 2, x: 103, y: 100, depth: 0.2 },
    { personId: 3, x: 140, y: 100, depth: 0.1 },
    { personId: 4, x: 101, y: 101, depth: 1.5 },
  ];
  expect(nearestPerson(points, { x: 100, y: 100 }, TAP_RADIUS)).toBe(2);
  expect(nearestPerson(points, { x: 140, y: 120 }, TAP_RADIUS)).toBe(3);
  expect(nearestPerson(points, { x: 300, y: 300 }, TAP_RADIUS)).toBeNull();
});

test('a tap is a short press that barely moves', () => {
  expect(isTap({ x: 0, y: 0, time: 0 }, { x: 5, y: 5, time: 300 })).toBe(true);
  expect(isTap({ x: 0, y: 0, time: 0 }, { x: 20, y: 0, time: 300 })).toBe(false);
  expect(isTap({ x: 0, y: 0, time: 0 }, { x: 0, y: 0, time: 900 })).toBe(false);
});
