import type { ReactElement } from 'react';
import { Icon, type IconName } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import type { CameraPreset } from './scene/sceneTypes';
import styles from './TowerPage.module.scss';

export interface TowerToolbarProps {
  isNarrow: boolean;
  isSearchOpen: boolean;
  isAllNames: boolean;
  isRotating: boolean;
  canGoBack: boolean;
  onSearch: () => void;
  onPreset: (preset: CameraPreset) => void;
  onBack: () => void;
  onToggleNames: () => void;
  onToggleRotation: () => void;
}

interface ToolButtonProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  isPressed?: boolean;
  isDisabled?: boolean;
}

export function TowerToolbar(props: TowerToolbarProps): ReactElement {
  const { onPreset } = props;
  const t = useT();
  return (
    <div role="group" aria-label={t('tower.controls')} className={styles.toolbar}>
      <ToolButton icon="search" label={t('tower.search')} isPressed={props.isSearchOpen} onClick={props.onSearch} />
      <ToolButton icon="cube" label={t('tower.overview')} onClick={() => { onPreset('overview'); }} />
      <ToolButton icon="layers" label={t('tower.side')} onClick={() => { onPreset('side'); }} />
      <ToolButton icon="rings" label={t('tower.top')} onClick={() => { onPreset('top'); }} />
      <ToolButton icon="chevronLeft" label={t('tower.back')} isDisabled={!props.canGoBack} onClick={props.onBack} />
      <ToolButton icon="label" label={t('tower.allNames')} isPressed={props.isAllNames} onClick={props.onToggleNames} />
      {!props.isNarrow && <ToolButton icon="rotate" label={t('tower.rotate')} isPressed={props.isRotating} onClick={props.onToggleRotation} />}
    </div>
  );
}

function ToolButton({ icon, label, onClick, isPressed, isDisabled = false }: ToolButtonProps): ReactElement {
  return (
    <button type="button" className={styles.toolButton} aria-pressed={isPressed} disabled={isDisabled} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}
