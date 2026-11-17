import { type ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { LoadingState } from '../../design/components';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { fullName } from '../people/personName';
import { usePersonIdParam } from '../people/usePersonIdParam';
import { NotFoundView } from '../shell/NotFoundPage';
import { PageError } from '../shell/PageStates';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { type TowerGraph, childrenOf, indexTreeGraph, parentsOf, spousesOf } from './layout/towerGraph';
import { layoutTower } from './layout/towerLayout';
import type { TowerLayout, TowerNode } from './layout/towerTypes';
import type { Relatives } from './PersonPanel';
import type { TowerScene } from './scene/sceneTypes';
import { useTreeGraph } from './treeGraphQueries';
import { useGestureHint } from './useGestureHint';
import { useTowerExplorer } from './useTowerExplorer';
import { type TowerDisplay, type TowerRotation, TowerView } from './TowerView';

export const NARROW_SCREEN = '(max-width: 40rem)';
export const TOUCH_SCREEN = '(pointer: coarse)';
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function TowerPage(): ReactElement {
  const personId = usePersonIdParam();
  return personId === null ? <NotFoundView /> : <TowerScreen personId={personId} />;
}

function TowerScreen({ personId }: { personId: number }): ReactElement {
  const treeGraph = useTreeGraph();
  const graph = useMemo(() => (treeGraph.data === undefined ? undefined : indexTreeGraph(treeGraph.data)), [treeGraph.data]);
  const layout = useMemo(() => (graph === undefined ? undefined : layoutTower(graph)), [graph]);
  const node = layout?.nodes.get(personId);
  useDocumentTitle(node === undefined ? null : `Time tower of ${fullName(node.person)}`);
  if (treeGraph.isLoadingError) {
    return <PageError error={treeGraph.error} onRetry={treeGraph.refetch} />;
  }
  if (graph === undefined || layout === undefined) {
    return <LoadingState label="Building the time tower…" />;
  }
  return node === undefined ? <NotFoundView /> : <TowerExplorerScreen graph={graph} layout={layout} node={node} />;
}

function TowerExplorerScreen({ graph, layout, node }: { graph: TowerGraph; layout: TowerLayout; node: TowerNode }): ReactElement {
  const explorer = useTowerExplorer(graph, node.person.id);
  const display = useTowerDisplay();
  const rotation = useRotation(display);
  const hint = useGestureHint();
  const sceneRef = useRef<TowerScene | null>(null);
  const relatives = useMemo(() => relativesOf(graph, node.person.id), [graph, node]);
  return <TowerView graph={graph} layout={layout} node={node} relatives={relatives} explorer={explorer} display={display} rotation={rotation} hint={hint} sceneRef={sceneRef} />;
}

function useTowerDisplay(): TowerDisplay {
  const isNarrow = useMediaQuery(NARROW_SCREEN);
  const isTouch = useMediaQuery(TOUCH_SCREEN);
  const isReducedMotion = useMediaQuery(REDUCED_MOTION);
  return useMemo(() => ({ isNarrow, isTouch, isReducedMotion }), [isNarrow, isTouch, isReducedMotion]);
}

function useRotation(display: TowerDisplay): TowerRotation {
  const [isRotating, setRotating] = useState(() => !display.isNarrow && !display.isReducedMotion);
  const toggle = useCallback(() => {
    setRotating((isOn) => !isOn);
  }, []);
  const stop = useCallback(() => {
    setRotating(false);
  }, []);
  return { isRotating, toggle, stop };
}

function relativesOf(graph: TowerGraph, personId: number): Relatives {
  const peopleWith = (ids: readonly number[]) =>
    ids.flatMap((relativeId) => {
      const relative = graph.people.get(relativeId);
      return relative === undefined ? [] : [relative];
    });
  return { parents: peopleWith(parentsOf(graph, personId)), spouses: peopleWith(spousesOf(graph, personId)), children: peopleWith(childrenOf(graph, personId)) };
}
