import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DARWIN_IDS } from '../../test/fixtures';
import { apiErrorResponse } from '../../test/handlers';
import { mockServer, setUpMockServer } from '../../test/mockServer';
import { type RenderedApp, renderApp } from '../../test/renderApp';
import type { SceneCallbacks, SceneFocus } from './scene/sceneTypes';
import { NARROW_SCREEN, TOUCH_SCREEN } from './TowerPage';
import { DEFAULT_TOWER_PANELS, rememberTowerPanels } from './towerPanels';
import { GESTURE_HINT_KEY } from './useGestureHint';

const fakeScene = vi.hoisted(() => ({
  canDraw: true,
  callbacks: undefined as SceneCallbacks | undefined,
  showFocus: vi.fn<(focus: SceneFocus) => void>(),
  flyToPerson: vi.fn<(personId: number) => void>(),
  showPreset: vi.fn<(preset: string) => void>(),
  setRotating: vi.fn<(isRotating: boolean) => void>(),
  setInsets: vi.fn(),
  setTexts: vi.fn(),
  refreshColors: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('./scene/towerScene', () => ({
  isWebGLAvailable: () => fakeScene.canDraw,
  createTowerScene: (_host: HTMLElement, options: { callbacks: SceneCallbacks }) => {
    fakeScene.callbacks = options.callbacks;
    return fakeScene;
  },
}));

const CHARLES = 'Charles Robert Darwin';
const PHONE_QUERIES = new Set([NARROW_SCREEN, TOUCH_SCREEN]);
const originalMatchMedia = window.matchMedia.bind(window);

setUpMockServer();

beforeEach(() => {
  fakeScene.canDraw = true;
  vi.clearAllMocks();
  window.localStorage.setItem(GESTURE_HINT_KEY, 'yes');
  rememberTowerPanels(DEFAULT_TOWER_PANELS);
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  window.localStorage.clear();
});

test('the tower opens on the person in the address with the switch, the key and the relatives', async () => {
  const { user } = await openTower();
  expect(document.title).toBe(`Time tower of ${CHARLES} · Family Tree`);
  const switcher = screen.getByRole('navigation', { name: 'Tree view' });
  expect(within(switcher).getAllByRole('link').map((link) => link.textContent)).toEqual(['Time tower', 'Cards']);
  expect(within(switcher).getByRole('link', { name: 'Cards' })).toHaveAttribute('href', '/tree/1');
  expect(within(switcher).getByRole('link', { name: 'Time tower' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('navigation', { name: 'Main' }).querySelector('[aria-current="page"]')).toHaveTextContent('Tree');
  const key = screen.getByRole('region', { name: 'Key' });
  const keyButton = within(key).getByRole('button', { name: 'Key' });
  expect(keyButton).toHaveAttribute('aria-expanded', 'false');
  await user.click(keyButton);
  expect(keyButton).toHaveAttribute('aria-expanded', 'true');
  expect(within(key).getByText('Height is the year of birth; rings mark decades, the oldest at the bottom.')).toBeInTheDocument();
  expect(within(key).getByText('Line of Robert Darwin')).toBeInTheDocument();
  expect(within(key).getByText('Married into the family')).toBeInTheDocument();
  const panel = screen.getByRole('complementary', { name: 'Selected person' });
  expect(within(panel).getByRole('heading', { level: 2, name: CHARLES })).toBeInTheDocument();
  expect(within(panel).getByText('1809–1882 · Generation 2')).toBeInTheDocument();
  expect(within(within(panel).getByRole('region', { name: 'Children' })).getByRole('button', { name: /William Erasmus Darwin/ })).toBeInTheDocument();
  expect(fakeScene.showFocus).toHaveBeenLastCalledWith(expect.objectContaining({ focusId: DARWIN_IDS.charles }));
});

test('on a wide screen the key and the details slide away and back, and the choice stays while the tab is open', async () => {
  const { user, router } = await openTower();
  const key = screen.getByRole('region', { name: 'Key' });
  expect(key).toHaveAttribute('data-open', 'false');
  expect(within(key).getByRole('list', { hidden: true })).toHaveAttribute('inert');
  await user.click(within(key).getByRole('button', { name: 'Key' }));
  expect(key).toHaveAttribute('data-open', 'true');
  expect(within(key).getByRole('list')).not.toHaveAttribute('inert');
  const panel = screen.getByRole('complementary', { name: 'Selected person' });
  const hide = screen.getByRole('button', { name: 'Hide details' });
  expect(hide).toHaveAttribute('aria-controls', panel.id);
  expect(hide).toHaveAttribute('aria-expanded', 'true');
  await user.click(hide);
  expect(panel).toHaveAttribute('inert');
  expect(screen.getByRole('button', { name: 'Show details' })).toHaveAttribute('aria-expanded', 'false');
  await leaveTowerAndReturn(router);
  expect(screen.getByRole('button', { name: 'Key' })).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('button', { name: 'Show details' }));
  expect(screen.getByRole('complementary', { name: 'Selected person', hidden: true })).not.toHaveAttribute('inert');
  expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
});

test('a person tapped in the tower becomes the selection and Back returns to the one before', async () => {
  const { router, user } = await openTower();
  act(() => {
    fakeScene.callbacks?.onPick(DARWIN_IDS.william);
  });
  expect(await screen.findByRole('heading', { level: 1, name: 'William Erasmus Darwin' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/tower/5');
  expect(fakeScene.flyToPerson).toHaveBeenCalledWith(DARWIN_IDS.william);
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(await screen.findByRole('heading', { level: 1, name: CHARLES })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
});

test('a relative chosen in the panel becomes the selection', async () => {
  const { user } = await openTower();
  const parents = screen.getByRole('region', { name: 'Parents' });
  await user.click(within(parents).getByRole('button', { name: /Robert Waring Darwin/ }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Robert Waring Darwin' })).toBeInTheDocument();
});

test('the search finds a person by name and flies to them', async () => {
  const { user, router } = await openTower();
  await user.click(screen.getByRole('button', { name: 'Search' }));
  const search = screen.getByRole('combobox', { name: 'Find a person' });
  expect(search).toHaveFocus();
  await user.type(search, 'emma');
  await user.click(await screen.findByRole('option', { name: /Emma Wedgwood/ }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Emma Wedgwood' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/tower/2');
  expect(screen.queryByRole('combobox', { name: 'Find a person' })).not.toBeInTheDocument();
});

test('the relationship path is listed in the panel and drawn in the tower until it is cleared', async () => {
  const { user } = await openTower();
  await user.click(screen.getByRole('button', { name: 'Relationship to…' }));
  await user.type(screen.getByRole('combobox', { name: 'Relationship of Charles Darwin to' }), 'susannah');
  await user.click(await screen.findByRole('option', { name: /Susannah Wedgwood/ }));
  const path = await screen.findByRole('region', { name: `How ${CHARLES} is related to Susannah Wedgwood` });
  expect(within(path).getByRole('button', { name: /Mother/ })).toHaveTextContent('Susannah Wedgwood');
  expect(lastFocus().pathIds).toEqual([DARWIN_IDS.charles, DARWIN_IDS.susannah]);
  await user.click(within(path).getByRole('button', { name: 'Clear the path' }));
  expect(screen.queryByRole('region', { name: /is related to/ })).not.toBeInTheDocument();
  expect(lastFocus().pathIds).toEqual([]);
});

test('the camera presets and rotation reach the tower', async () => {
  const { user } = await openTower();
  for (const name of ['Overview', 'Side', 'Top']) {
    await user.click(screen.getByRole('button', { name }));
  }
  expect(fakeScene.showPreset.mock.calls).toEqual([['overview'], ['side'], ['top']]);
  expect(fakeScene.setRotating).toHaveBeenLastCalledWith(true);
  await user.click(screen.getByRole('button', { name: 'Rotate' }));
  expect(fakeScene.setRotating).toHaveBeenLastCalledWith(false);
});

test('everyone is named at first, and the names button leaves only the selected person and the close family', async () => {
  const { user } = await openTower('/tower/5', 'William Erasmus Darwin');
  const names = screen.getByRole('button', { name: 'All names' });
  expect(names).toHaveAttribute('aria-pressed', 'true');
  expect(lastFocus().labelledIds.size).toBe(5);
  await user.click(names);
  expect(names).toHaveAttribute('aria-pressed', 'false');
  expect([...lastFocus().labelledIds]).toEqual([DARWIN_IDS.william, DARWIN_IDS.charles, DARWIN_IDS.emma]);
});

test('the gesture hint shows on the first visit and is remembered once dismissed', async () => {
  window.localStorage.removeItem(GESTURE_HINT_KEY);
  const { user } = await openTower();
  expect(screen.getByText('Drag to turn · Scroll to zoom · Click a ball to open a person')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.queryByText(/Drag to turn/)).not.toBeInTheDocument();
  expect(window.localStorage.getItem(GESTURE_HINT_KEY)).toBe('yes');
});

test('turning the tower by hand hides the hint and stops the rotation', async () => {
  window.localStorage.removeItem(GESTURE_HINT_KEY);
  await openTower();
  act(() => {
    fakeScene.callbacks?.onInteract();
  });
  expect(screen.queryByText(/Drag to turn/)).not.toBeInTheDocument();
  expect(fakeScene.setRotating).toHaveBeenLastCalledWith(false);
});

test('on a phone the selected person sits in a bottom sheet that opens with a tap or a swipe', async () => {
  window.matchMedia = phoneMediaList;
  window.localStorage.removeItem(GESTURE_HINT_KEY);
  const { user } = await openTower();
  expect(screen.getByText('Drag to turn · Pinch to zoom · Tap a ball to open a person')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rotate' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hide details' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Key' })).toHaveAttribute('aria-expanded', 'false');
  expect(within(screen.getByRole('region', { name: 'Time tower' })).getByRole('navigation', { name: 'Tree view' })).toBeInTheDocument();
  const handle = screen.getByRole('button', { name: /Show details/ });
  expect(handle).toHaveTextContent(`${CHARLES}1809–1882 · Generation 2`);
  await user.click(handle);
  expect(handle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('region', { name: 'Parents' })).toBeInTheDocument();
  expect(screen.getAllByText(CHARLES)).toHaveLength(2);
  swipe(handle, 100);
  expect(handle).toHaveAttribute('aria-expanded', 'false');
  swipe(handle, -100);
  expect(handle).toHaveAttribute('aria-expanded', 'true');
});

test('an address with someone outside the tree shows page not found', async () => {
  renderApp('/tower/999');
  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
});

test('an address without a person number shows page not found', async () => {
  renderApp('/tower/charles');
  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
});

test('without WebGL the cards view is offered instead', async () => {
  fakeScene.canDraw = false;
  renderApp('/tower/1');
  expect(await screen.findByText('This browser cannot draw the 3D tower.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open the cards view' })).toHaveAttribute('href', '/tree/1');
});

test('an ended session is explained instead of the tower', async () => {
  mockServer.use(http.get('/api/workspace/graph/', () => apiErrorResponse(401, { code: 'auth.unauthenticated', message: 'Sign in to continue.' })));
  renderApp('/tower/1');
  expect(await screen.findByRole('heading', { level: 1, name: 'Your session has ended' })).toBeInTheDocument();
});

test('the cards page offers the way back to the time tower', async () => {
  renderApp('/tree/1');
  const switcher = await screen.findByRole('navigation', { name: 'Tree view' });
  expect(within(switcher).getByRole('link', { name: 'Time tower' })).toHaveAttribute('href', '/tower/1');
  expect(within(switcher).getByRole('link', { name: 'Cards' })).toHaveAttribute('aria-current', 'page');
});

async function openTower(path = '/tower/1', name = CHARLES): Promise<RenderedApp> {
  const rendered = renderApp(path);
  await screen.findByRole('heading', { level: 1, name });
  await waitFor(() => {
    expect(fakeScene.showFocus).toHaveBeenCalled();
  });
  return rendered;
}

async function leaveTowerAndReturn(router: RenderedApp['router']): Promise<void> {
  await act(() => router.navigate('/people/1'));
  await waitFor(() => {
    expect(screen.queryByRole('region', { name: 'Time tower' })).not.toBeInTheDocument();
  });
  await act(() => router.navigate('/tower/1'));
  await screen.findByRole('region', { name: 'Time tower' });
}

function lastFocus(): SceneFocus {
  const focus = fakeScene.showFocus.mock.lastCall?.[0];
  if (focus === undefined) {
    throw new Error('The tower never received a focus.');
  }
  return focus;
}

function phoneMediaList(query: string): MediaQueryList {
  return {
    matches: PHONE_QUERIES.has(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  };
}

function swipe(handle: HTMLElement, distance: number): void {
  fireEvent.pointerDown(handle, { clientY: 400 });
  fireEvent.pointerUp(handle, { clientY: 400 + distance });
  fireEvent.click(handle);
}
