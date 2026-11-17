import { type ReactElement, type RefObject, useEffect, useEffectEvent, useRef, useState } from 'react';
import { ButtonLink } from '../../design/components';
import type { TowerLayout } from './layout/towerTypes';
import type { SceneFocus, TowerScene, ViewInsets } from './scene/sceneTypes';
import { createTowerScene, isWebGLAvailable } from './scene/towerScene';
import styles from './TowerPage.module.scss';

export interface TowerCanvasProps {
  layout: TowerLayout;
  focus: SceneFocus;
  sceneRef: RefObject<TowerScene | null>;
  isRotating: boolean;
  isReducedMotion: boolean;
  insets: ViewInsets;
  cardsPath: string;
  onPick: (personId: number) => void;
  onInteract: () => void;
}

export function TowerCanvas(props: TowerCanvasProps): ReactElement {
  const [canDraw] = useState(isWebGLAvailable);
  return canDraw ? <SceneHost {...props} /> : <NoWebGL cardsPath={props.cardsPath} />;
}

function SceneHost(props: TowerCanvasProps): ReactElement {
  const { layout, isReducedMotion, sceneRef, onPick, onInteract } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const handlePick = useEffectEvent(onPick);
  const handleInteract = useEffectEvent(onInteract);
  const initialInsets = useEffectEvent(() => props.insets);
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return undefined;
    }
    const callbacks = { onPick: (personId: number) => { handlePick(personId); }, onInteract: () => { handleInteract(); } };
    const scene = createTowerScene(host, { layout, isReducedMotion, callbacks, insets: initialInsets() });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [layout, isReducedMotion, sceneRef]);
  useSceneState(props);
  return <div ref={hostRef} className={styles.canvasHost} />;
}

function useSceneState({ layout, focus, sceneRef, isRotating, isReducedMotion, insets }: TowerCanvasProps): void {
  const shownFocusRef = useRef<number | null>(null);
  useEffect(() => {
    sceneRef.current?.setInsets(insets);
  }, [insets, layout, isReducedMotion, sceneRef]);
  useEffect(() => {
    sceneRef.current?.showFocus(focus);
  }, [focus, layout, isReducedMotion, sceneRef]);
  useEffect(() => {
    sceneRef.current?.setRotating(isRotating);
  }, [isRotating, layout, isReducedMotion, sceneRef]);
  useEffect(() => {
    if (shownFocusRef.current !== null && shownFocusRef.current !== focus.focusId) {
      sceneRef.current?.flyToPerson(focus.focusId);
    }
    shownFocusRef.current = focus.focusId;
  }, [focus.focusId, sceneRef]);
}

function NoWebGL({ cardsPath }: { cardsPath: string }): ReactElement {
  return (
    <div className={styles.noWebGL}>
      <p>This browser cannot draw the 3D tower.</p>
      <ButtonLink to={cardsPath}>Open the cards view</ButtonLink>
    </div>
  );
}
