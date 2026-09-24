import type { AncestorTree } from './ancestry';
import { type Contour, contourOf, type Extent } from './contour';
import { type CardPosition, coupleAnchor, parentageEdge, partnershipEdge, soloAnchor } from './edgeBuilders';
import { type BusLane, busY, CARD_WIDTH, centreOf, COUPLE_GAP, FAMILY_GAP, type GridPosition } from './geometry';
import { combineHalves, type PlacedHalf } from './placedHalf';
import { packGroupedRow, type Placed, type RowGaps, shiftPlaced, spanCentre } from './rowPacking';
import type { ChartEdge } from './types';

interface ArrangedAncestor {
  readonly tree: AncestorTree;
  readonly contour: Contour;
  readonly parentGroups: readonly ArrangedParentGroup[];
}

interface ArrangedParentGroup {
  readonly parents: readonly Placed<ArrangedAncestor>[];
  readonly isDashed: boolean;
}

interface ParentGroupEmission {
  readonly group: ArrangedParentGroup;
  readonly child: CardPosition;
  readonly lane: BusLane;
}

const CARD_EXTENT: Extent = { left: -CARD_WIDTH / 2, right: CARD_WIDTH / 2 };
const ANCESTOR_GAPS: RowGaps = { withinGroup: COUPLE_GAP, betweenGroups: FAMILY_GAP };

export function placeAncestry(focus: AncestorTree): PlacedHalf {
  return emitParents(arrangeAncestor(focus), { x: 0, generation: 0 });
}

function arrangeAncestor(tree: AncestorTree): ArrangedAncestor {
  const packed = packGroupedRow(
    tree.parentGroups.map((group) => group.parents.map(arrangeAncestor)),
    ANCESTOR_GAPS,
  );
  const centring = -spanCentre(packed.flat());
  const parentGroups = tree.parentGroups.map((group, position) => ({
    isDashed: group.isDashed,
    parents: shiftPlaced(packed[position] ?? [], centring),
  }));
  const contour = contourOf(
    CARD_EXTENT,
    parentGroups.flatMap((group) => group.parents),
  );
  return { tree, contour, parentGroups };
}

function emitParents(child: ArrangedAncestor, at: GridPosition): PlacedHalf {
  const childCard = { key: child.tree.key, centre: centreOf(at) };
  const count = child.parentGroups.length;
  return combineHalves(
    child.parentGroups.map((group, index) =>
      emitParentGroup({ group, child: childCard, lane: { generation: at.generation - 1, index, count } }),
    ),
  );
}

function emitParentGroup(emission: ParentGroupEmission): PlacedHalf {
  const { group, child, lane } = emission;
  const ancestors = group.parents.map((parent) =>
    emitAncestor(parent, { x: child.centre.x + parent.offset, generation: lane.generation }),
  );
  return combineHalves([{ occurrences: [], edges: parentGroupEdges(emission) }, ...ancestors]);
}

function emitAncestor(ancestor: ArrangedAncestor, at: GridPosition): PlacedHalf {
  const above = emitParents(ancestor, at);
  const occurrence = { key: ancestor.tree.key, person: ancestor.tree.person, x: at.x, generation: at.generation };
  return { occurrences: [occurrence, ...above.occurrences], edges: above.edges };
}

function parentGroupEdges({ group, child, lane }: ParentGroupEmission): ChartEdge[] {
  const [first, second] = group.parents.map((parent) => ({
    key: parent.tree.key,
    centre: centreOf({ x: child.centre.x + parent.offset, generation: lane.generation }),
  }));
  if (first === undefined) {
    return [];
  }
  const descent = { sourceKey: first.key, child, busLevel: busY(lane), isDashed: group.isDashed };
  if (second === undefined) {
    return [parentageEdge({ ...descent, anchor: soloAnchor(first.centre) })];
  }
  return [partnershipEdge(first, second), parentageEdge({ ...descent, anchor: coupleAnchor(first.centre, second.centre) })];
}
