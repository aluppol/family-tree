import { Group } from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { classNames } from '../../../design/classNames';
import type { TowerNode } from '../layout/towerTypes';
import { shortName } from '../towerText';
import styles from '../TowerScene.module.scss';
import type { ScreenLabel } from './labelDeclutter';
import { SPHERE_RADIUS } from './peopleMeshes';
import type { SceneFocus } from './sceneTypes';

const LABEL_LIFT = SPHERE_RADIUS * 2.2;

export class NameLabels {
  readonly group = new Group();
  private readonly nodes: ReadonlyMap<number, TowerNode>;
  private readonly shown = new Map<number, CSS2DObject>();
  private focusId: number | null = null;
  private hover: { readonly personId: number; readonly label: CSS2DObject } | null = null;

  constructor(nodes: ReadonlyMap<number, TowerNode>) {
    this.nodes = nodes;
  }

  show(focus: SceneFocus): void {
    this.focusId = focus.focusId;
    for (const [personId, label] of this.shown) {
      if (!focus.labelledIds.has(personId) && personId !== focus.focusId) {
        this.group.remove(label);
        this.shown.delete(personId);
      }
    }
    for (const personId of [focus.focusId, ...focus.labelledIds]) {
      const label = this.shown.get(personId) ?? this.added(personId);
      label.element.className = classNames(styles.label, personId === focus.focusId && styles.focusLabel, focus.pathIds.includes(personId) && styles.pathLabel);
    }
  }

  showHover(personId: number | null, focus: SceneFocus | null): void {
    if (this.hover !== null) {
      this.group.remove(this.hover.label);
      this.hover = null;
    }
    if (personId !== null && focus?.labelledIds.has(personId) !== true && personId !== focus?.focusId) {
      const label = this.labelFor(personId);
      label.element.className = classNames(styles.label, styles.hoverLabel);
      this.hover = { personId, label };
      this.group.add(label);
    }
  }

  screenLabels(): ScreenLabel[] {
    const focusLabel = this.focusId === null ? undefined : this.shown.get(this.focusId);
    const first = focusLabel === undefined ? [] : [screenLabelOf('focus', focusLabel, true)];
    const hover = this.hover === null ? [] : [screenLabelOf('hover', this.hover.label, false)];
    const rest = [...this.shown].filter(([personId]) => personId !== this.focusId).map(([personId, label]) => screenLabelOf(`person-${String(personId)}`, label, false));
    return [...first, ...hover, ...rest];
  }

  dispose(): void {
    this.group.clear();
    this.shown.clear();
  }

  private added(personId: number): CSS2DObject {
    const label = this.labelFor(personId);
    this.shown.set(personId, label);
    this.group.add(label);
    return label;
  }

  private labelFor(personId: number): CSS2DObject {
    const element = document.createElement('div');
    const node = this.nodes.get(personId);
    element.textContent = node === undefined ? '' : shortName(node.person);
    const label = new CSS2DObject(element);
    if (node !== undefined) {
      label.position.set(node.position.x, node.position.y + LABEL_LIFT, node.position.z);
    }
    return label;
  }
}

function screenLabelOf(key: string, label: CSS2DObject, isFocus: boolean): ScreenLabel {
  return { key, element: label.element, position: label.position, isFocus };
}
