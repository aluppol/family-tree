import { Group } from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { PersonSummary } from '../../../api/types';
import { classNames } from '../../../design/classNames';
import type { TowerNode } from '../layout/towerTypes';
import styles from '../TowerScene.module.scss';
import type { LabelKind, ScreenLabel } from './labelDeclutter';
import { SPHERE_RADIUS } from './peopleMeshes';
import type { SceneFocus } from './sceneTypes';

const LABEL_LIFT = SPHERE_RADIUS * 2.2;

const KIND_CLASSES: Record<LabelKind, string | undefined> = {
  focus: styles.focusLabel,
  regular: undefined,
  compact: styles.compactLabel,
};

const KIND_PRIORITY: Record<LabelKind, number> = { focus: 0, regular: 1, compact: 2 };

interface ShownLabel {
  readonly label: CSS2DObject;
  readonly kind: LabelKind;
}

export type PersonNameText = (person: PersonSummary) => string;

export class NameLabels {
  readonly group = new Group();
  private readonly nodes: ReadonlyMap<number, TowerNode>;
  private shown = new Map<number, ShownLabel>();
  private hover: CSS2DObject | null = null;
  private personName: PersonNameText;

  constructor(nodes: ReadonlyMap<number, TowerNode>, personName: PersonNameText) {
    this.nodes = nodes;
    this.personName = personName;
  }

  rename(personName: PersonNameText): void {
    this.personName = personName;
    for (const [personId, { label }] of this.shown) {
      label.element.textContent = this.textFor(personId);
    }
  }

  show(focus: SceneFocus): void {
    const wanted = [focus.focusId, ...[...focus.labelledIds].filter((personId) => personId !== focus.focusId)];
    const isWanted = new Set(wanted);
    for (const [personId, { label }] of this.shown) {
      if (!isWanted.has(personId)) {
        this.group.remove(label);
      }
    }
    this.shown = new Map(wanted.map((personId) => [personId, this.labelled(personId, kindOf(personId, focus))]));
    for (const [personId, { label, kind }] of this.shown) {
      label.element.className = classNames(styles.label, KIND_CLASSES[kind], focus.pathIds.includes(personId) && styles.pathLabel);
    }
  }

  showHover(personId: number | null): void {
    if (this.hover !== null) {
      this.group.remove(this.hover);
      this.hover = null;
    }
    if (personId !== null && !this.shown.has(personId)) {
      this.hover = this.labelFor(personId);
      this.hover.element.className = classNames(styles.label, styles.hoverLabel);
      this.group.add(this.hover);
    }
  }

  screenLabels(): ScreenLabel[] {
    const ordered = [...this.shown].sort(([, first], [, second]) => KIND_PRIORITY[first.kind] - KIND_PRIORITY[second.kind]);
    const people = ordered.map(([personId, { label, kind }]): ScreenLabel => ({ key: `person-${String(personId)}`, element: label.element, position: label.position, kind }));
    const hover: ScreenLabel[] = this.hover === null ? [] : [{ key: 'hover', element: this.hover.element, position: this.hover.position, kind: 'regular' }];
    return [...people.slice(0, 1), ...hover, ...people.slice(1)];
  }

  dispose(): void {
    this.group.clear();
    this.shown.clear();
  }

  private labelled(personId: number, kind: LabelKind): ShownLabel {
    const existing = this.shown.get(personId);
    if (existing !== undefined) {
      return { label: existing.label, kind };
    }
    const label = this.labelFor(personId);
    this.group.add(label);
    return { label, kind };
  }

  private labelFor(personId: number): CSS2DObject {
    const element = document.createElement('div');
    const node = this.nodes.get(personId);
    element.textContent = this.textFor(personId);
    const label = new CSS2DObject(element);
    if (node !== undefined) {
      label.position.set(node.position.x, node.position.y + LABEL_LIFT, node.position.z);
    }
    return label;
  }

  private textFor(personId: number): string {
    const node = this.nodes.get(personId);
    return node === undefined ? '' : this.personName(node.person);
  }
}

function kindOf(personId: number, focus: SceneFocus): LabelKind {
  if (personId === focus.focusId) {
    return 'focus';
  }
  return focus.highlightedIds.has(personId) ? 'regular' : 'compact';
}
