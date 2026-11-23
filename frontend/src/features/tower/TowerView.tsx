import { type ReactElement, type RefObject, useRef, useState } from 'react';
import { Button, Icon } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { treePath } from '../../routePaths';
import { fullName } from '../people/personName';
import { ViewSwitch } from '../tree-views/ViewSwitch';
import { BottomSheet } from './BottomSheet';
import type { TowerGraph } from './layout/towerGraph';
import type { TowerLayout, TowerNode } from './layout/towerTypes';
import { PersonDetails, PersonPanel, type Relatives } from './PersonPanel';
import type { TowerScene, ViewInsets } from './scene/sceneTypes';
import { TowerCanvas } from './TowerCanvas';
import { TowerKey } from './TowerKey';
import styles from './TowerPage.module.scss';
import { TowerSearch } from './TowerSearch';
import { type TowerPanels, toggleTowerDetails, toggleTowerKey, useTowerPanels } from './towerPanels';
import { TowerToolbar } from './TowerToolbar';
import { shortName, towerFactsText } from './towerText';
import type { GestureHint } from './useGestureHint';
import type { TowerExplorer } from './useTowerExplorer';
import { useViewportFill } from './useViewportFill';

export interface TowerDisplay {
  readonly isNarrow: boolean;
  readonly isTouch: boolean;
  readonly isReducedMotion: boolean;
}

export interface TowerRotation {
  readonly isRotating: boolean;
  readonly toggle: () => void;
  readonly stop: () => void;
}

export interface TowerViewProps {
  graph: TowerGraph;
  layout: TowerLayout;
  node: TowerNode;
  relatives: Relatives;
  explorer: TowerExplorer;
  display: TowerDisplay;
  rotation: TowerRotation;
  hint: GestureHint;
  sceneRef: RefObject<TowerScene | null>;
}

type SearchMode = 'person' | 'relation';

const PHONE_INSETS: ViewInsets = { top: 64, bottom: 148 };
const WIDE_INSETS: ViewInsets = { top: 0, bottom: 92 };
const DETAILS_PANEL_ID = 'tower-selected-person';

export function TowerView(props: TowerViewProps): ReactElement {
  const t = useT();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [searchMode, setSearchMode] = useState<SearchMode | null>(null);
  const panels = useTowerPanels();
  useViewportFill(workspaceRef);
  return (
    <div className={styles.page}>
      {props.display.isNarrow ? (
        <h1 className="visually-hidden">{fullName(t, props.node.person)}</h1>
      ) : (
        <header className={styles.bar}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{fullName(t, props.node.person)}</h1>
            <p className={styles.subtitle}>{t('tower.name')}</p>
          </div>
          <ViewSwitch personId={props.node.person.id} current="tower" />
        </header>
      )}
      <div ref={workspaceRef} className={styles.workspace} data-details={props.display.isNarrow ? undefined : detailsStateOf(panels)}>
        <TowerStage {...props} panels={panels} searchMode={searchMode} onSearchModeChange={setSearchMode} />
        <SelectedPerson {...props} isDetailsOpen={panels.isDetailsOpen} onAskRelation={() => { setSearchMode('relation'); }} />
      </div>
    </div>
  );
}

interface StageProps extends TowerViewProps {
  panels: TowerPanels;
  searchMode: SearchMode | null;
  onSearchModeChange: (mode: SearchMode | null) => void;
}

function TowerStage(props: StageProps): ReactElement {
  const { layout, explorer, display, rotation, hint, sceneRef, searchMode, onSearchModeChange } = props;
  const t = useT();
  function handleInteract(): void {
    hint.dismiss();
    rotation.stop();
  }
  return (
    <section className={styles.stage} aria-label={t('tower.name')}>
      <TowerCanvas
        layout={layout}
        focus={explorer.focus}
        sceneRef={sceneRef}
        isRotating={rotation.isRotating}
        isReducedMotion={display.isReducedMotion}
        insets={display.isNarrow ? PHONE_INSETS : WIDE_INSETS}
        cardsPath={treePath(props.node.person.id)}
        onPick={explorer.select}
        onInteract={handleInteract}
      />
      <StageOverlay {...props} />
      {searchMode !== null && <StageSearch {...props} searchMode={searchMode} onClose={() => { onSearchModeChange(null); }} />}
      {hint.isVisible && <GestureHintCard isTouch={display.isTouch} onDismiss={hint.dismiss} />}
      <StageToolbar {...props} />
    </section>
  );
}

function StageOverlay({ layout, node, display, panels }: StageProps): ReactElement {
  return (
    <div className={styles.overlayTop}>
      <TowerKey axis={layout.axis} legend={layout.legend} hasMarriages={layout.marriages.length > 0} isOpen={panels.isKeyOpen} onToggle={toggleTowerKey} />
      {display.isNarrow ? <ViewSwitch personId={node.person.id} current="tower" /> : <DetailsToggle isOpen={panels.isDetailsOpen} />}
    </div>
  );
}

function DetailsToggle({ isOpen }: { isOpen: boolean }): ReactElement {
  const t = useT();
  return (
    <button type="button" className={styles.overlayButton} aria-expanded={isOpen} aria-controls={DETAILS_PANEL_ID} onClick={toggleTowerDetails}>
      <Icon name={isOpen ? 'chevronRight' : 'chevronLeft'} />
      {isOpen ? t('tower.hideDetails') : t('tower.showDetails')}
    </button>
  );
}

function StageToolbar({ explorer, display, rotation, sceneRef, searchMode, onSearchModeChange }: StageProps): ReactElement {
  return (
    <TowerToolbar
      isNarrow={display.isNarrow}
      isSearchOpen={searchMode === 'person'}
      isAllNames={explorer.isAllNames}
      isRotating={rotation.isRotating}
      canGoBack={explorer.canGoBack}
      onSearch={() => { onSearchModeChange(searchMode === 'person' ? null : 'person'); }}
      onPreset={(preset) => { sceneRef.current?.showPreset(preset); }}
      onBack={explorer.goBack}
      onToggleNames={explorer.toggleAllNames}
      onToggleRotation={rotation.toggle}
    />
  );
}

function StageSearch({ graph, node, explorer, searchMode, onClose }: StageProps & { searchMode: SearchMode; onClose: () => void }): ReactElement {
  const t = useT();
  const label = searchMode === 'person' ? t('tower.findPerson') : t('tower.relationshipOf', { name: shortName(t, node.person) });
  function handleChoose(personId: number): void {
    if (searchMode === 'person') {
      explorer.select(personId);
    } else {
      explorer.showRelationTo(personId);
    }
    onClose();
  }
  return <TowerSearch key={searchMode} people={[...graph.people.values()]} label={label} onChoose={handleChoose} onClose={onClose} />;
}

function GestureHintCard({ isTouch, onDismiss }: { isTouch: boolean; onDismiss: () => void }): ReactElement {
  const t = useT();
  return (
    <div className={styles.hint}>
      <p>{isTouch ? t('tower.touchHint') : t('tower.pointerHint')}</p>
      <Button size="small" variant="ghost" onClick={onDismiss}>
        {t('tower.gotIt')}
      </Button>
    </div>
  );
}

function SelectedPerson(props: TowerViewProps & { isDetailsOpen: boolean; onAskRelation: () => void }): ReactElement {
  const { node, relatives, explorer, layout, display } = props;
  const t = useT();
  const [isSheetExpanded, setSheetExpanded] = useState(false);
  const lineHeads = new Map(layout.legend.lines.map((line) => [line.lineIndex, line.head]));
  const panelProps = { node, relatives, lineHeads, relation: explorer.relation, onSelect: explorer.select, onAskRelation: props.onAskRelation, onClearRelation: explorer.clearRelation };
  if (!display.isNarrow) {
    return (
      <aside id={DETAILS_PANEL_ID} className={styles.panel} aria-label={t('tower.selectedPerson')} inert={!props.isDetailsOpen}>
        <div className={styles.panelBody}>
          <PersonPanel {...panelProps} />
        </div>
      </aside>
    );
  }
  return (
    <BottomSheet title={fullName(t, node.person)} summary={towerFactsText(t, node.person, node.generation)} isExpanded={isSheetExpanded} onExpandedChange={setSheetExpanded}>
      <PersonDetails {...panelProps} />
    </BottomSheet>
  );
}

function detailsStateOf(panels: TowerPanels): 'shown' | 'hidden' {
  return panels.isDetailsOpen ? 'shown' : 'hidden';
}
