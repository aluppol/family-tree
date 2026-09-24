import type { FamilyChart } from '../../../api/types';
import { buildAncestry } from './ancestry';
import { measureBounds } from './bounds';
import { buildDescent } from './descent';
import { indexFamilyChart } from './familyIndex';
import { placeAncestry } from './placeAncestry';
import { placeDescent } from './placeDescent';
import { toChartNodes } from './readingOrder';
import { focusKey } from './traversal';
import type { ChartEdge, HourglassLayout } from './types';

export function layoutHourglass(chart: FamilyChart): HourglassLayout {
  const index = indexFamilyChart(chart);
  const { focus } = index;
  if (focus === undefined) {
    return { nodes: [], edges: [], bounds: measureBounds([], []) };
  }
  const ancestors = placeAncestry(buildAncestry(index, focus));
  const descendants = placeDescent(buildDescent(index, focus));
  const nodes = toChartNodes([...descendants.occurrences, ...ancestors.occurrences], focusKey(focus));
  const edges = drawingOrder([...ancestors.edges, ...descendants.edges]);
  return { nodes, edges, bounds: measureBounds(nodes, edges) };
}

function drawingOrder(edges: readonly ChartEdge[]): ChartEdge[] {
  return [...edges.filter((edge) => edge.isDashed), ...edges.filter((edge) => !edge.isDashed)];
}
