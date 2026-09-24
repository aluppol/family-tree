import { CARD_HEIGHT, CARD_WIDTH } from './geometry';
import type { ChartBounds, ChartEdge, ChartNode } from './types';

const EMPTY_BOUNDS: ChartBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

export function measureBounds(nodes: readonly ChartNode[], edges: readonly ChartEdge[]): ChartBounds {
  if (nodes.length === 0) {
    return EMPTY_BOUNDS;
  }
  const edgePoints = edges.flatMap((edge) => edge.points);
  const xs = [...nodes.flatMap((node) => [node.x - CARD_WIDTH / 2, node.x + CARD_WIDTH / 2]), ...edgePoints.map((point) => point.x)];
  const ys = [...nodes.flatMap((node) => [node.y - CARD_HEIGHT / 2, node.y + CARD_HEIGHT / 2]), ...edgePoints.map((point) => point.y)];
  return { minX: smallestOf(xs), minY: smallestOf(ys), maxX: largestOf(xs), maxY: largestOf(ys) };
}

function smallestOf(values: readonly number[]): number {
  return values.reduce((smallest, value) => Math.min(smallest, value), Number.POSITIVE_INFINITY);
}

function largestOf(values: readonly number[]): number {
  return values.reduce((largest, value) => Math.max(largest, value), Number.NEGATIVE_INFINITY);
}
