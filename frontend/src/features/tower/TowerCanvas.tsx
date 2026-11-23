import { type ReactElement, type RefObject, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { ButtonLink } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import type { TowerLayout } from './layout/towerTypes';
import type { SceneFocus, SceneTexts, TowerScene, ViewInsets } from './scene/sceneTypes';
import { createTowerScene, isWebGLAvailable } from './scene/towerScene';
import styles from './TowerPage.module.scss';
import { sceneTextsOf } from './towerText';

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

interface SceneHostProps extends TowerCanvasProps {
  texts: SceneTexts;
}

export function TowerCanvas(props: TowerCanvasProps): ReactElement {
  const t = useT();
  const [canDraw] = useState(isWebGLAvailable);
  const texts = useMemo(() => sceneTextsOf(t), [t]);
  return canDraw ? <SceneHost {...props} texts={texts} /> : <NoWebGL cardsPath={props.cardsPath} />;
}

function SceneHost(props: SceneHostProps): ReactElement {
  const { layout, isReducedMotion, sceneRef, onPick, onInteract } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const handlePick = useEffectEvent(onPick);
  const handleInteract = useEffectEvent(onInteract);
  const initialInsets = useEffectEvent(() => props.insets);
  const initialTexts = useEffectEvent(() => props.texts);
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return undefined;
    }
    const callbacks = { onPick: (personId: number) => { handlePick(personId); }, onInteract: () => { handleInteract(); } };
    const scene = createTowerScene(host, { layout, isReducedMotion, callbacks, insets: initialInsets(), texts: initialTexts() });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [layout, isReducedMotion, sceneRef]);
  useSceneState(props);
  return <div ref={hostRef} className={styles.canvasHost} />;
}

function useSceneState({ layout, focus, sceneRef, isRotating, isReducedMotion, insets, texts }: SceneHostProps): void {
  const shownFocusRef = useRef<number | null>(null);
  useEffect(() => {
    sceneRef.current?.setInsets(insets);
  }, [insets, layout, isReducedMotion, sceneRef]);
  useEffect(() => {
    sceneRef.current?.setTexts(texts);
  }, [texts, layout, isReducedMotion, sceneRef]);
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
  const t = useT();
  return (
    <div className={styles.noWebGL}>
      <p>{t('tower.noWebGL')}</p>
      <ButtonLink to={cardsPath}>{t('tower.openCardsView')}</ButtonLink>
    </div>
  );
}
