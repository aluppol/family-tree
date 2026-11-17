import { fireEvent } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { layoutTower } from '../layout/towerLayout';
import { personIdOf, towerGraphOf } from '../testing/towerScript';
import type { SceneFocus, SceneRenderer, TowerScene } from './sceneTypes';
import { SCENE_LABEL, createTowerScene, isWebGLAvailable } from './towerScene';

const GRAPH = towerGraphOf({
  people: [['Jovan', 'male', null], ['Petar', 'male', null], ['Marko', 'male', null], ['Ana', 'female', null], ['Mara', 'female', null]],
  parents: [['Jovan', 'Petar'], ['Jovan', 'Marko'], ['Petar', 'Ana', 'adopted']],
  partners: [['Petar', 'Mara']],
});
const LAYOUT = layoutTower(GRAPH);
const SCREEN = { x: 0, y: 0, top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600, toJSON: () => ({}) } as DOMRect;
const PETAR = personIdOf(GRAPH, 'Petar');

interface MountedScene {
  host: HTMLDivElement;
  scene: TowerScene;
  renderer: SceneRenderer;
  callbacks: { onPick: ReturnType<typeof vi.fn>; onInteract: ReturnType<typeof vi.fn> };
}

const mounted: MountedScene[] = [];

afterEach(() => {
  for (const { scene, host } of mounted.splice(0)) {
    scene.dispose();
    host.remove();
  }
});

test('the scene mounts a described canvas with a label layer and removes both when disposed', () => {
  const { host, scene, renderer } = mountScene({ isReducedMotion: true });
  expect(host.querySelector('canvas')).toHaveAttribute('aria-label', SCENE_LABEL);
  expect(host.children).toHaveLength(2);
  scene.dispose();
  expect(host.children).toHaveLength(0);
  expect(renderer.dispose).toHaveBeenCalled();
  mounted.splice(0);
});

test('a focus labels the people it asks for and draws the frame again', async () => {
  const { host, scene, renderer } = mountScene({ isReducedMotion: true });
  scene.showFocus(focusOn(PETAR, ['Petar', 'Jovan', 'Mara']));
  await nextFrame();
  expect(labelTexts(host)).toEqual(expect.arrayContaining(['Petar', 'Jovan', 'Mara']));
  expect(labelTexts(host)).not.toContain('Ana');
  expect(renderer.render).toHaveBeenCalled();
  scene.showFocus(focusOn(PETAR, ['Ana'], ['Petar', 'Ana']));
  await nextFrame();
  expect(labelTexts(host).filter((text) => !text.startsWith('Generation'))).toEqual(['Petar', 'Ana']);
});

test('a tap on a person picks them and a drag picks no one', () => {
  const { scene, renderer, callbacks } = mountScene({ isReducedMotion: true });
  scene.flyToPerson(PETAR);
  press(renderer.domElement, { from: [400, 300], to: [402, 301] });
  expect(callbacks.onPick).toHaveBeenCalledWith(PETAR);
  press(renderer.domElement, { from: [400, 300], to: [470, 300] });
  expect(callbacks.onPick).toHaveBeenCalledTimes(1);
  expect(callbacks.onInteract).toHaveBeenCalled();
});

test('with the bottom of the screen covered, the view centres on the part that stays visible', () => {
  const { scene, renderer, callbacks } = mountScene({ isReducedMotion: true });
  scene.setInsets({ top: 0, bottom: 200 });
  scene.flyToPerson(PETAR);
  press(renderer.domElement, { from: [400, 200], to: [400, 200] });
  expect(callbacks.onPick).toHaveBeenCalledWith(PETAR);
});

test('a change of size draws the tower at once, so it does not blink while a side panel slides', () => {
  const { scene, renderer } = mountScene({ isReducedMotion: true });
  vi.mocked(renderer.render).mockClear();
  scene.setInsets({ top: 0, bottom: 120 });
  expect(renderer.render).toHaveBeenCalledTimes(1);
});

test('a scene in a box without size waits without failing', () => {
  const { host, scene } = mountScene({ isReducedMotion: true });
  host.getBoundingClientRect = () => ({ ...SCREEN.toJSON(), x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
  expect(() => {
    scene.setInsets({ top: 10, bottom: 10 });
  }).not.toThrow();
});

test('hovering with a mouse names the person under the pointer until it leaves', async () => {
  const { host, scene, renderer } = mountScene({ isReducedMotion: true });
  scene.showFocus(focusOn(personIdOf(GRAPH, 'Jovan'), []));
  scene.flyToPerson(PETAR);
  fireEvent.pointerMove(renderer.domElement, { clientX: 400, clientY: 300, pointerType: 'mouse', buttons: 0 });
  await nextFrame();
  expect(labelTexts(host)).toContain('Petar');
  expect(renderer.domElement.style.cursor).toBe('pointer');
  fireEvent.pointerLeave(renderer.domElement);
  await nextFrame();
  expect(labelTexts(host)).not.toContain('Petar');
});

test('presets, colours and rotation can be changed at any time without errors', async () => {
  const { scene, renderer } = mountScene({ isReducedMotion: false });
  scene.showPreset('top');
  scene.showPreset('side');
  scene.refreshColors();
  scene.setRotating(true);
  scene.flyToPerson(9999);
  await nextFrame();
  await nextFrame();
  expect(vi.mocked(renderer.render).mock.calls.length).toBeGreaterThanOrEqual(2);
  scene.setRotating(false);
});

test('WebGL counts as available only when the browser returns a drawing context', () => {
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
  getContext.mockReturnValue(null);
  expect(isWebGLAvailable()).toBe(false);
  getContext.mockReturnValueOnce({} as RenderingContext);
  expect(isWebGLAvailable()).toBe(true);
  getContext.mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(isWebGLAvailable()).toBe(false);
});

function mountScene({ isReducedMotion }: { isReducedMotion: boolean }): MountedScene {
  const host = document.createElement('div');
  host.getBoundingClientRect = () => SCREEN;
  document.body.append(host);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => SCREEN;
  const renderer: SceneRenderer = { domElement: canvas, setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() };
  const callbacks = { onPick: vi.fn(), onInteract: vi.fn() };
  const scene = createTowerScene(host, { layout: LAYOUT, callbacks, isReducedMotion, insets: { top: 0, bottom: 0 } }, () => renderer);
  const result = { host, scene, renderer, callbacks };
  mounted.push(result);
  return result;
}

function focusOn(focusId: number, labelled: readonly string[], path: readonly string[] = []): SceneFocus {
  const idsOf = (names: readonly string[]): number[] => names.map((name) => personIdOf(GRAPH, name));
  return { focusId, highlightedIds: new Set([focusId, ...idsOf(labelled)]), labelledIds: new Set(idsOf(labelled)), pathIds: idsOf(path) };
}

function press(target: HTMLElement, { from, to }: { from: readonly [number, number]; to: readonly [number, number] }): void {
  fireEvent.pointerDown(target, { clientX: from[0], clientY: from[1], pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(target, { clientX: to[0], clientY: to[1], pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse' });
}

function labelTexts(host: HTMLElement): string[] {
  return [...host.querySelectorAll('canvas + div > div')].filter((element) => element instanceof HTMLElement && element.style.display !== 'none').map((element) => element.textContent);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}
