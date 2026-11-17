import { type Camera, Vector3 } from 'three';

export interface LabelBox {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isInView: boolean;
}

export type LabelKind = 'focus' | 'regular' | 'compact';

export interface ScreenLabel {
  readonly key: string;
  readonly element: HTMLElement;
  readonly position: Vector3;
  readonly kind: LabelKind;
}

export interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

interface LabelMetrics {
  readonly characterWidth: number;
  readonly padding: number;
  readonly height: number;
}

const LABEL_METRICS: Record<LabelKind, LabelMetrics> = {
  focus: { characterWidth: 8.4, padding: 20, height: 26 },
  regular: { characterWidth: 7.2, padding: 20, height: 22 },
  compact: { characterWidth: 6.2, padding: 8, height: 16 },
};

const BREATHING_ROOM = 2;

export function estimatedLabelSize(text: string, kind: LabelKind): { width: number; height: number } {
  const metrics = LABEL_METRICS[kind];
  return { width: text.length * metrics.characterWidth + metrics.padding, height: metrics.height };
}

export function visibleLabelKeys(boxes: readonly LabelBox[]): ReadonlySet<string> {
  const placed: LabelBox[] = [];
  for (const box of boxes) {
    if (box.isInView && !placed.some((other) => overlap(box, other))) {
      placed.push(box);
    }
  }
  return new Set(placed.map((box) => box.key));
}

export function hideCrowdedLabels(labels: readonly ScreenLabel[], camera: Camera, screen: ScreenSize): void {
  const projected = new Vector3();
  const boxes = labels.map(({ key, element, position, kind }): LabelBox => {
    projected.copy(position).project(camera);
    const size = estimatedLabelSize(element.textContent, kind);
    return { key, ...size, x: ((projected.x + 1) / 2) * screen.width, y: ((1 - projected.y) / 2) * screen.height, isInView: projected.z >= -1 && projected.z <= 1 };
  });
  const visible = visibleLabelKeys(boxes);
  for (const { key, element } of labels) {
    element.style.visibility = visible.has(key) ? '' : 'hidden';
  }
}

function overlap(first: LabelBox, second: LabelBox): boolean {
  const horizontal = Math.abs(first.x - second.x) * 2 < first.width + second.width + BREATHING_ROOM;
  const vertical = Math.abs(first.y - second.y) * 2 < first.height + second.height + BREATHING_ROOM;
  return horizontal && vertical;
}
