import type { Camera, Scene } from 'three';
import type { TowerLayout } from '../layout/towerTypes';

export type CameraPreset = 'overview' | 'side' | 'top';

export interface SceneCallbacks {
  readonly onPick: (personId: number) => void;
  readonly onInteract: () => void;
}

export interface SceneFocus {
  readonly focusId: number;
  readonly highlightedIds: ReadonlySet<number>;
  readonly labelledIds: ReadonlySet<number>;
  readonly pathIds: readonly number[];
}

export interface ViewInsets {
  readonly top: number;
  readonly bottom: number;
}

export interface TowerSceneOptions {
  readonly layout: TowerLayout;
  readonly callbacks: SceneCallbacks;
  readonly isReducedMotion: boolean;
  readonly insets: ViewInsets;
}

export interface SceneRenderer {
  readonly domElement: HTMLCanvasElement;
  setSize: (width: number, height: number, updateStyle?: boolean) => void;
  render: (scene: Scene, camera: Camera) => void;
  dispose: () => void;
}

export type RendererFactory = () => SceneRenderer;

export interface TowerScene {
  showFocus: (focus: SceneFocus) => void;
  flyToPerson: (personId: number) => void;
  showPreset: (preset: CameraPreset) => void;
  setRotating: (isRotating: boolean) => void;
  setInsets: (insets: ViewInsets) => void;
  refreshColors: () => void;
  dispose: () => void;
}
