import { type Contour, contourOf, type Extent } from './contour';
import type { ChildGroup, DescendantBranch, DescentTree, PartnerSlot } from './descent';
import { bracketPartnershipEdge, type CardPosition, parentageEdge, partnershipEdge } from './edgeBuilders';
import { type BusLane, busY, CARD_HEIGHT, CARD_WIDTH, centreOf, FAMILY_GAP, type GridPosition, PARTNER_PITCH, type Point, SIBLING_GAP } from './geometry';
import { sortedBy } from './ordering';
import { combineHalves, type PlacedHalf } from './placedHalf';
import { packGroupedRow, type Placed, type RowGaps, shiftPlaced, spanCentre } from './rowPacking';
import type { ChartEdge } from './types';

interface ArrangedFamily {
  readonly tree: DescentTree;
  readonly contour: Contour;
  readonly partners: readonly Placed<PartnerSlot>[];
  readonly childGroups: readonly ArrangedChildGroup[];
}

interface ArrangedChildGroup {
  readonly anchor: Point;
  readonly children: readonly Placed<ArrangedChild>[];
}

interface ArrangedChild {
  readonly family: ArrangedFamily;
  readonly contour: Contour;
  readonly isDashed: boolean;
}

interface ChildGroupEmission {
  readonly group: ArrangedChildGroup;
  readonly parent: CardPosition;
  readonly lane: BusLane;
}

const DESCENDANT_GAPS: RowGaps = { withinGroup: SIBLING_GAP, betweenGroups: FAMILY_GAP };

export function placeDescent(focus: DescentTree): PlacedHalf {
  return emitFamily(arrangeFamily(focus), { x: 0, generation: 0 });
}

function arrangeFamily(tree: DescentTree): ArrangedFamily {
  const partners = tree.partners.map((slot, position) => ({ ...slot, offset: partnerOffset(position, tree.partners.length) }));
  const groups = sortedBy(
    tree.childGroups.map((group) => ({ group, anchor: anchorOf(group, partners) })),
    (entry) => [entry.anchor.x],
  );
  const packed = packGroupedRow(
    groups.map(({ group }) => group.children.map(arrangeBranch)),
    DESCENDANT_GAPS,
  );
  const aligned = groups.map(({ anchor }, position) => ({ anchor, children: packed[position] ?? [] }));
  const shift = meanOf(aligned.map(({ anchor, children }) => anchor.x - spanCentre(children)));
  const childGroups = aligned.map(({ anchor, children }) => ({ anchor, children: shiftPlaced(children, shift) }));
  const contour = contourOf(unitExtent(partners), childGroups.flatMap((group) => group.children));
  return { tree, contour, partners, childGroups };
}

function arrangeBranch(branch: DescendantBranch): ArrangedChild {
  const family = arrangeFamily(branch.tree);
  return { family, contour: family.contour, isDashed: branch.isDashed };
}

function partnerOffset(position: number, partnerCount: number): number {
  if (partnerCount === 1) {
    return PARTNER_PITCH;
  }
  return position === 0 ? -PARTNER_PITCH : position * PARTNER_PITCH;
}

function anchorOf(group: ChildGroup, partners: readonly Placed<PartnerSlot>[]): Point {
  const partner = group.partnerPosition === null ? undefined : partners[group.partnerPosition];
  if (partner === undefined) {
    return { x: 0, y: CARD_HEIGHT / 2 };
  }
  return { x: partner.offset - (Math.sign(partner.offset) * PARTNER_PITCH) / 2, y: 0 };
}

function unitExtent(partners: readonly Placed<PartnerSlot>[]): Extent {
  const offsets = [0, ...partners.map((partner) => partner.offset)];
  return { left: Math.min(...offsets) - CARD_WIDTH / 2, right: Math.max(...offsets) + CARD_WIDTH / 2 };
}

function meanOf(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function emitFamily(family: ArrangedFamily, at: GridPosition): PlacedHalf {
  const person = { key: family.tree.key, centre: centreOf(at) };
  const partnerOccurrences = family.partners.map((partner) => ({
    key: partner.key,
    person: partner.person,
    x: at.x + partner.offset,
    generation: at.generation,
  }));
  const count = family.childGroups.length;
  const descendants = family.childGroups.map((group, index) =>
    emitChildGroup({ group, parent: person, lane: { generation: at.generation, index, count } }),
  );
  const ownOccurrence = { key: family.tree.key, person: family.tree.person, x: at.x, generation: at.generation };
  return combineHalves([
    { occurrences: [ownOccurrence, ...partnerOccurrences], edges: partnershipEdges(person, family.partners) },
    ...descendants,
  ]);
}

function partnershipEdges(person: CardPosition, partners: readonly Placed<PartnerSlot>[]): ChartEdge[] {
  return partners.map((partner) => {
    const partnerCard = { key: partner.key, centre: { x: person.centre.x + partner.offset, y: person.centre.y } };
    const distance = Math.abs(partner.offset) / PARTNER_PITCH;
    if (distance > 1) {
      return bracketPartnershipEdge({ person, partner: partnerCard, level: distance - 1 });
    }
    return partner.offset < 0 ? partnershipEdge(partnerCard, person) : partnershipEdge(person, partnerCard);
  });
}

function emitChildGroup({ group, parent, lane }: ChildGroupEmission): PlacedHalf {
  const anchor = { x: parent.centre.x + group.anchor.x, y: parent.centre.y + group.anchor.y };
  const halves = group.children.map((child) => {
    const childCard = { key: child.family.tree.key, centre: centreOf({ x: parent.centre.x + child.offset, generation: lane.generation + 1 }) };
    const edge = parentageEdge({ sourceKey: parent.key, anchor, child: childCard, busLevel: busY(lane), isDashed: child.isDashed });
    const subtree = emitFamily(child.family, { x: childCard.centre.x, generation: lane.generation + 1 });
    return { occurrences: subtree.occurrences, edges: [edge, ...subtree.edges] };
  });
  return combineHalves(halves);
}
