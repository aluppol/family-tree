import { type Camera, Vector3 } from 'three';

export interface LabelBox {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isInView: boolean;
}

export interface ScreenLabel {
  readonly key: string;
  readonly element: HTMLElement;
  readonly position: Vector3;
  readonly isFocus: boolean;
}

export interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

const CHARACTER_WIDTH = 7.2;
const FOCUS_CHARACTER_WIDTH = 8.4;
const LABEL_PADDING = 20;
const LABEL_HEIGHT = 22;
const FOCUS_LABEL_HEIGHT = 26;
const BREATHING_ROOM = 2;

export function estimatedLabelSize(text: string, isFocus: boolean): { width: number; height: number } {
  return {
    width: text.length * (isFocus ? FOCUS_CHARACTER_WIDTH : CHARACTER_WIDTH) + LABEL_PADDING,
    height: isFocus ? FOCUS_LABEL_HEIGHT : LABEL_HEIGHT,
  };
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
  const boxes = labels.map(({ key, element, position, isFocus }): LabelBox => {
    projected.copy(position).project(camera);
    const size = estimatedLabelSize(element.textContent, isFocus);
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
