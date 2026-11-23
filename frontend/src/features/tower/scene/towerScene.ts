import { DirectionalLight, type Group, HemisphereLight, PerspectiveCamera, Scene, TOUCH, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { TowerLayout, TowerPoint } from '../layout/towerTypes';
import styles from '../TowerScene.module.scss';
import { type CameraMove, type CameraPose, type Extent, FLIGHT_MS, fittingDistance, isMoveFinished, personPose, poseAt, presetPose } from './cameraMath';
import { EdgeLines } from './edgeLines';
import { type ScreenSize, hideCrowdedLabels } from './labelDeclutter';
import { NameLabels } from './nameLabels';
import { PathTubes } from './pathTubes';
import { PeopleMeshes } from './peopleMeshes';
import { RingGuides } from './ringGuides';
import { type ScenePalette, readPalette } from './sceneColors';
import type { CameraPreset, RendererFactory, SceneFocus, SceneRenderer, SceneTexts, TowerScene, TowerSceneOptions, ViewInsets } from './sceneTypes';
import { type Pointer, type ScreenPoint, TAP_RADIUS, isTap, nearestPerson } from './screenPicking';

const FIELD_OF_VIEW = 45;
const MAX_PIXEL_RATIO = 2;
const SMALLEST_VISIBLE_SHARE = 0.4;
const ROTATION_SPEED = 0.6;
const DARK_SCHEME = '(prefers-color-scheme: dark)';

interface World {
  readonly people: PeopleMeshes;
  readonly edges: EdgeLines;
  readonly rings: RingGuides;
  readonly labels: NameLabels;
  readonly path: PathTubes;
}

interface WorldPart {
  readonly group: Group;
  dispose: () => void;
}

interface PressedPointer extends Pointer {
  readonly time: number;
  readonly pointerId: number;
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}

export function createWebGLRenderer(): SceneRenderer {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  return renderer;
}

export function createTowerScene(host: HTMLElement, options: TowerSceneOptions, createRenderer: RendererFactory = createWebGLRenderer): TowerScene {
  return new TowerSceneController(host, options, createRenderer);
}

class TowerSceneController implements TowerScene {
  private readonly host: HTMLElement;
  private readonly options: TowerSceneOptions;
  private readonly renderer: SceneRenderer;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 5000);
  private readonly controls: OrbitControls;
  private readonly world: World;
  private readonly extent: Extent;
  private readonly colorScheme = window.matchMedia(DARK_SCHEME);
  private readonly resizeObserver: ResizeObserver | null;
  private palette: ScenePalette;
  private focus: SceneFocus | null = null;
  private move: CameraMove | null = null;
  private frameRequest: number | null = null;
  private pressed: PressedPointer | null = null;
  private hoveredId: number | null = null;
  private screen: ScreenSize = { width: 1, height: 1 };
  private insets: ViewInsets;

  constructor(host: HTMLElement, options: TowerSceneOptions, createRenderer: RendererFactory) {
    this.host = host;
    this.options = options;
    this.insets = options.insets;
    this.renderer = createRenderer();
    this.palette = readPalette(host);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.world = buildWorld(options);
    this.extent = extentOf(options.layout);
    this.resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(this.resize);
    this.mount();
    this.bindEvents();
    this.fitToHost();
    this.applyPose(presetPose('overview', this.extent, this.viewport()));
    this.refreshColors();
  }

  showFocus(focus: SceneFocus): void {
    this.focus = focus;
    this.world.people.paint(this.palette, focus);
    this.world.edges.paint(this.palette, focus);
    this.world.labels.show(focus);
    this.world.labels.showHover(this.hoveredId);
    this.world.path.show(this.pointsOf(focus.pathIds), this.palette);
    this.requestFrame();
  }

  flyToPerson(personId: number): void {
    const node = this.options.layout.nodes.get(personId);
    if (node !== undefined) {
      this.startMove(personPose(node.position, this.currentPose(), this.viewport()));
    }
  }

  setInsets(insets: ViewInsets): void {
    this.insets = insets;
    this.resize();
  }

  setTexts(texts: SceneTexts): void {
    this.renderer.domElement.setAttribute('aria-label', texts.description);
    this.world.rings.relabel(texts.ringLabel);
    this.world.labels.rename(texts.personName);
    this.requestFrame();
  }

  showPreset(preset: CameraPreset): void {
    this.startMove(presetPose(preset, this.extent, this.viewport()));
  }

  setRotating(isRotating: boolean): void {
    this.controls.autoRotate = isRotating && !this.options.isReducedMotion;
    this.requestFrame();
  }

  refreshColors(): void {
    this.palette = readPalette(this.host);
    this.scene.background = this.palette.background.clone();
    this.world.rings.paint(this.palette);
    this.world.people.paint(this.palette, this.focus);
    this.world.edges.paint(this.palette, this.focus);
    this.world.path.recolor(this.palette);
    this.requestFrame();
  }

  dispose(): void {
    if (this.frameRequest !== null) {
      window.cancelAnimationFrame(this.frameRequest);
    }
    this.unbindEvents();
    this.controls.dispose();
    for (const part of partsOf(this.world)) {
      part.dispose();
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }

  private mount(): void {
    const canvas = this.renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', this.options.texts.description);
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
    this.labelRenderer.domElement.className = styles.labels ?? '';
    this.host.append(canvas, this.labelRenderer.domElement);
    const sun = new DirectionalLight(0xffffff, 1.5);
    sun.position.set(6, 14, 9);
    this.scene.add(new HemisphereLight(0xffffff, 0x8a8278, 1.3), sun, ...partsOf(this.world).map((part) => part.group));
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
    this.controls.autoRotateSpeed = ROTATION_SPEED;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = fittingDistance('overview', this.extent, { aspect: 0.5, verticalFieldOfView: FIELD_OF_VIEW }) * 2;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    this.controls.addEventListener('change', this.requestFrame);
    this.controls.addEventListener('start', this.handleInteract);
    this.colorScheme.addEventListener('change', this.handleSchemeChange);
    this.resizeObserver?.observe(this.host);
  }

  private unbindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.controls.removeEventListener('change', this.requestFrame);
    this.controls.removeEventListener('start', this.handleInteract);
    this.colorScheme.removeEventListener('change', this.handleSchemeChange);
    this.resizeObserver?.disconnect();
  }

  private readonly resize = (): void => {
    this.fitToHost();
    this.drawNow();
  };

  private fitToHost(): void {
    const { width, height } = this.host.getBoundingClientRect();
    this.screen = { width, height };
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    this.fitViewWindow(width, height);
  }

  private drawNow(): void {
    if (this.frameRequest !== null) {
      window.cancelAnimationFrame(this.frameRequest);
    }
    this.renderFrame(performance.now());
  }

  private fitViewWindow(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      this.camera.clearViewOffset();
      this.camera.aspect = 1;
      this.camera.updateProjectionMatrix();
      return;
    }
    const visibleHeight = Math.max(height - this.insets.top - this.insets.bottom, height * SMALLEST_VISIBLE_SHARE);
    this.camera.aspect = width / visibleHeight;
    this.camera.setViewOffset(width, visibleHeight, 0, -Math.min(this.insets.top, height - visibleHeight), width, height);
    this.camera.updateProjectionMatrix();
  }

  private readonly requestFrame = (): void => {
    this.frameRequest ??= window.requestAnimationFrame(this.renderFrame);
  };

  private readonly renderFrame = (now: number): void => {
    this.frameRequest = null;
    this.advanceMove(now);
    const isSettling = this.controls.update();
    this.renderer.render(this.scene, this.camera);
    hideCrowdedLabels([...this.world.labels.screenLabels(), ...this.world.rings.screenLabels()], this.camera, this.screen);
    this.labelRenderer.render(this.scene, this.camera);
    if (this.move !== null || isSettling || this.controls.autoRotate) {
      this.requestFrame();
    }
  };

  private readonly handleInteract = (): void => {
    this.move = null;
    this.options.callbacks.onInteract();
  };

  private readonly handleSchemeChange = (): void => {
    this.refreshColors();
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pressed = event.isPrimary ? { x: event.clientX, y: event.clientY, time: event.timeStamp, pointerId: event.pointerId } : null;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const pressed = this.pressed;
    this.pressed = null;
    if (pressed?.pointerId !== event.pointerId || !isTap(pressed, { x: event.clientX, y: event.clientY, time: event.timeStamp })) {
      return;
    }
    const personId = this.personAt(event);
    if (personId !== null) {
      this.options.callbacks.onPick(personId);
    }
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      this.showHover(this.personAt(event));
    }
  };

  private readonly handlePointerLeave = (): void => {
    this.showHover(null);
  };

  private showHover(personId: number | null): void {
    if (personId === this.hoveredId) {
      return;
    }
    this.hoveredId = personId;
    this.renderer.domElement.style.cursor = personId === null ? 'grab' : 'pointer';
    this.world.labels.showHover(personId);
    this.requestFrame();
  }

  private personAt(event: PointerEvent): number | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    return nearestPerson(this.projectedPeople(bounds), { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, TAP_RADIUS);
  }

  private projectedPeople(bounds: DOMRect): ScreenPoint[] {
    const projected = new Vector3();
    return [...this.options.layout.nodes.values()].map((node) => {
      projected.set(node.position.x, node.position.y, node.position.z).project(this.camera);
      return { personId: node.person.id, x: ((projected.x + 1) / 2) * bounds.width, y: ((1 - projected.y) / 2) * bounds.height, depth: projected.z };
    });
  }

  private startMove(to: CameraPose): void {
    if (this.options.isReducedMotion) {
      this.applyPose(to);
    } else {
      this.move = { startedAt: performance.now(), durationMs: FLIGHT_MS, from: this.currentPose(), to };
    }
    this.requestFrame();
  }

  private advanceMove(now: number): void {
    if (this.move === null) {
      return;
    }
    this.applyPose(poseAt(this.move, now));
    if (isMoveFinished(this.move, now)) {
      this.move = null;
    }
  }

  private applyPose({ target, position }: CameraPose): void {
    this.controls.target.set(target.x, target.y, target.z);
    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(this.controls.target);
  }

  private currentPose(): CameraPose {
    const { target } = this.controls;
    const { position } = this.camera;
    return { target: { x: target.x, y: target.y, z: target.z }, position: { x: position.x, y: position.y, z: position.z } };
  }

  private viewport(): { aspect: number; verticalFieldOfView: number } {
    return { aspect: this.camera.aspect, verticalFieldOfView: FIELD_OF_VIEW };
  }

  private pointsOf(personIds: readonly number[]): TowerPoint[] {
    return personIds.flatMap((personId) => {
      const node = this.options.layout.nodes.get(personId);
      return node === undefined ? [] : [node.position];
    });
  }
}

function partsOf(world: World): WorldPart[] {
  return [world.people, world.edges, world.rings, world.labels, world.path];
}

function buildWorld({ layout, texts }: TowerSceneOptions): World {
  return {
    people: new PeopleMeshes([...layout.nodes.values()]),
    edges: new EdgeLines(layout),
    rings: new RingGuides(layout.rings, texts.ringLabel),
    labels: new NameLabels(layout.nodes, texts.personName),
    path: new PathTubes(),
  };
}

function extentOf(layout: TowerLayout): Extent {
  const nodes = [...layout.nodes.values()];
  const heights = [...nodes.map((node) => node.position.y), ...layout.rings.map((ring) => ring.y)];
  const radii = [...nodes.map((node) => Math.hypot(node.position.x, node.position.z)), ...layout.rings.map((ring) => ring.radius)];
  const low = Math.min(0, ...heights);
  const high = Math.max(0, ...heights);
  return { centre: { x: 0, y: (low + high) / 2, z: 0 }, radius: Math.max(0, ...radii), halfHeight: (high - low) / 2 };
}
