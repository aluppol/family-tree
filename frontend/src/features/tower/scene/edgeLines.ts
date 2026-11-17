import { BufferAttribute, BufferGeometry, type Color, Group, LineBasicMaterial, LineDashedMaterial, LineSegments, QuadraticBezierCurve3, Vector3 } from 'three';
import type { TowerLayout, TowerNode, TowerPoint } from '../layout/towerTypes';
import { disposeMaterial } from './peopleMeshes';
import { type ScenePalette, fadedTowardBackground } from './sceneColors';
import type { SceneFocus } from './sceneTypes';

const CURVE_STEPS = 8;
const SAG = 0.6;
const FADE = 0.75;

type Ends = readonly [number, number];

interface Span {
  readonly first: number;
  readonly count: number;
  readonly ends: Ends;
}

interface SegmentPlan {
  readonly vertices: readonly number[];
  readonly spans: readonly Span[];
}

interface LineSet {
  readonly line: LineSegments<BufferGeometry, LineBasicMaterial>;
  readonly colors: BufferAttribute;
  readonly spans: readonly Span[];
  readonly isMarriage: boolean;
}

export class EdgeLines {
  readonly group = new Group();
  private readonly sets: readonly LineSet[];

  constructor(layout: TowerLayout) {
    const birthEnds = layout.edges.filter((edge) => edge.kind === 'birth').map((edge): Ends => [edge.parentId, edge.childId]);
    const otherEnds = layout.edges.filter((edge) => edge.kind !== 'birth').map((edge): Ends => [edge.parentId, edge.childId]);
    const marriageEnds = layout.marriages.map((marriage): Ends => [marriage.firstId, marriage.secondId]);
    const dashed = new LineDashedMaterial({ vertexColors: true, dashSize: 0.25, gapSize: 0.18 });
    this.sets = [
      lineSetOf(segmentsOf(layout.nodes, birthEnds, curvePoints), new LineBasicMaterial({ vertexColors: true }), false),
      lineSetOf(segmentsOf(layout.nodes, otherEnds, curvePoints), dashed, false),
      lineSetOf(segmentsOf(layout.nodes, marriageEnds, straightPoints), new LineBasicMaterial({ vertexColors: true }), true),
    ];
    this.group.add(...this.sets.map((set) => set.line));
  }

  paint(palette: ScenePalette, focus: SceneFocus | null): void {
    for (const set of this.sets) {
      const base = set.isMarriage ? palette.gold : palette.edge;
      for (const span of set.spans) {
        const isLit = focus === null || span.ends.every((personId) => focus.highlightedIds.has(personId));
        fillSpan(set.colors, span, isLit ? base : fadedTowardBackground(base, palette, FADE));
      }
      set.colors.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const set of this.sets) {
      set.line.geometry.dispose();
      disposeMaterial(set.line.material);
    }
  }
}

function segmentsOf(nodes: ReadonlyMap<number, TowerNode>, connections: readonly Ends[], pointsBetween: (from: TowerPoint, to: TowerPoint) => Vector3[]): SegmentPlan {
  const vertices: number[] = [];
  const spans: Span[] = [];
  for (const ends of connections) {
    const [from, to] = ends.map((personId) => nodes.get(personId)?.position);
    if (from !== undefined && to !== undefined) {
      const points = pointsBetween(from, to);
      spans.push({ first: vertices.length / 3, count: (points.length - 1) * 2, ends });
      vertices.push(...pairedCoordinates(points));
    }
  }
  return { vertices, spans };
}

function lineSetOf(plan: SegmentPlan, material: LineBasicMaterial, isMarriage: boolean): LineSet {
  const geometry = new BufferGeometry();
  const colors = new BufferAttribute(new Float32Array(plan.vertices.length), 3);
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(plan.vertices), 3));
  geometry.setAttribute('color', colors);
  const line = new LineSegments(geometry, material);
  line.computeLineDistances();
  return { line, colors, spans: plan.spans, isMarriage };
}

function curvePoints(from: TowerPoint, to: TowerPoint): Vector3[] {
  const start = new Vector3(from.x, from.y, from.z);
  const end = new Vector3(to.x, to.y, to.z);
  const control = start.clone().add(end).multiplyScalar(0.5);
  control.y -= SAG;
  return new QuadraticBezierCurve3(start, control, end).getPoints(CURVE_STEPS);
}

function straightPoints(from: TowerPoint, to: TowerPoint): Vector3[] {
  return [new Vector3(from.x, from.y, from.z), new Vector3(to.x, to.y, to.z)];
}

function pairedCoordinates(points: readonly Vector3[]): number[] {
  return points.slice(1).flatMap((point, position) => {
    const previous = points[position] ?? point;
    return [previous.x, previous.y, previous.z, point.x, point.y, point.z];
  });
}

function fillSpan(colors: BufferAttribute, span: Span, color: Color): void {
  for (let offset = 0; offset < span.count; offset += 1) {
    colors.setXYZ(span.first + offset, color.r, color.g, color.b);
  }
}
