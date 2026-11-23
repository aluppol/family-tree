import { BufferGeometry, EllipseCurve, Group, LineBasicMaterial, LineLoop, Vector3 } from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { RingLabel, TowerRing } from '../layout/towerTypes';
import styles from '../TowerScene.module.scss';
import type { ScreenLabel } from './labelDeclutter';
import type { ScenePalette } from './sceneColors';

const RING_POINTS = 96;
const MAJOR_OPACITY = 0.6;
const MINOR_OPACITY = 0.22;
const LABEL_OFFSET = 0.5;

interface RingLoop {
  readonly ring: TowerRing;
  readonly line: LineLoop<BufferGeometry, LineBasicMaterial>;
}

interface RingCaption {
  readonly label: RingLabel;
  readonly object: CSS2DObject;
}

export type RingLabelText = (label: RingLabel) => string;

export class RingGuides {
  readonly group = new Group();
  private readonly loops: readonly RingLoop[];
  private readonly captions: readonly RingCaption[];

  constructor(rings: readonly TowerRing[], labelText: RingLabelText) {
    this.loops = rings.map((ring) => ({ ring, line: loopOf(ring) }));
    this.captions = rings.flatMap((ring) => (ring.label === null ? [] : [{ label: ring.label, object: ringLabel(ring, labelText(ring.label)) }]));
    this.group.add(...this.loops.map((loop) => loop.line), ...this.captions.map((caption) => caption.object));
  }

  screenLabels(): ScreenLabel[] {
    return this.captions.map(({ object }, position) => ({ key: `ring-${String(position)}`, element: object.element, position: object.position, kind: 'compact' }));
  }

  relabel(labelText: RingLabelText): void {
    for (const { label, object } of this.captions) {
      object.element.textContent = labelText(label);
    }
  }

  paint(palette: ScenePalette): void {
    for (const { ring, line } of this.loops) {
      line.material.color.copy(palette.ring);
      line.material.opacity = ring.isMajor ? MAJOR_OPACITY : MINOR_OPACITY;
    }
  }

  dispose(): void {
    for (const { line } of this.loops) {
      line.geometry.dispose();
      line.material.dispose();
    }
    this.group.clear();
  }
}

function loopOf(ring: TowerRing): LineLoop<BufferGeometry, LineBasicMaterial> {
  const points = new EllipseCurve(0, 0, ring.radius, ring.radius).getPoints(RING_POINTS).map((point) => new Vector3(point.x, ring.y, point.y));
  return new LineLoop(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ transparent: true, depthWrite: false }));
}

function ringLabel(ring: TowerRing, text: string): CSS2DObject {
  const element = document.createElement('div');
  element.className = styles.ringLabel ?? '';
  element.textContent = text;
  const label = new CSS2DObject(element);
  label.position.set(ring.radius + LABEL_OFFSET, ring.y, 0);
  return label;
}
