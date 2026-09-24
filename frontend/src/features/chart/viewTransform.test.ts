import { describe, expect, it } from 'vitest';
import type { ChartBounds } from './layout/types';
import { centredView, fittedView, openingView, scaleLimits, showsWholeCard } from './viewTransform';

const WIDE_CHART: ChartBounds = { minX: -500, minY: -200, maxX: 500, maxY: 200 };
const ONE_CARD: ChartBounds = { minX: -108, minY: -36, maxX: 108, maxY: 36 };

describe('fittedView', () => {
  it.each([
    { id: 'fits exactly', bounds: WIDE_CHART, viewport: { width: 1048, height: 448 }, view: { x: 524, y: 224, scale: 1 } },
    { id: 'shrinks to the narrower side', bounds: WIDE_CHART, viewport: { width: 548, height: 448 }, view: { x: 274, y: 224, scale: 0.5 } },
    { id: 'never enlarges a small chart', bounds: ONE_CARD, viewport: { width: 1200, height: 800 }, view: { x: 600, y: 400, scale: 1 } },
    { id: 'keeps a positive scale without a viewport', bounds: ONE_CARD, viewport: { width: 0, height: 0 }, view: { x: 0, y: 0, scale: 0.02 } },
  ])('$id', ({ bounds, viewport, view }) => {
    expect(fittedView(bounds, viewport)).toEqual(view);
  });
});

describe('openingView', () => {
  it('shows the whole chart when it fits at a readable size', () => {
    expect(openingView({ bounds: WIDE_CHART, focus: { x: 100, y: 0 }, viewport: { width: 1048, height: 448 } })).toEqual({ x: 524, y: 224, scale: 1 });
  });

  it('centres the focus person at a readable size when the whole chart would be too small', () => {
    expect(openingView({ bounds: WIDE_CHART, focus: { x: 100, y: 0 }, viewport: { width: 548, height: 448 } })).toEqual({ x: 199, y: 224, scale: 0.75 });
  });
});

describe('centredView', () => {
  it('puts the point in the middle of the viewport', () => {
    expect(centredView({ point: { x: 10, y: -20 }, viewport: { width: 400, height: 300 }, scale: 2 })).toEqual({ x: 180, y: 190, scale: 2 });
  });
});

describe('scaleLimits', () => {
  it.each([
    [{ width: 548, height: 448 }, [0.2, 2.5]],
    [{ width: 148, height: 448 }, [0.1, 2.5]],
  ])('lets the viewer zoom out at least to the whole chart in %o', (viewport, limits) => {
    expect(scaleLimits(WIDE_CHART, viewport)).toEqual(limits);
  });
});

describe('showsWholeCard', () => {
  const view = { x: 200, y: 150, scale: 1 };
  const viewport = { width: 400, height: 300 };

  it.each([
    ['a card in the middle', { x: 0, y: 0 }, true],
    ['a card past the right edge', { x: 150, y: 0 }, false],
    ['a card past the left edge', { x: -150, y: 0 }, false],
    ['a card above the top', { x: 0, y: -130 }, false],
    ['a card below the bottom', { x: 0, y: 130 }, false],
  ])('recognises %s', (_case, centre, isShown) => {
    expect(showsWholeCard({ view, viewport, centre })).toBe(isShown);
  });
});
