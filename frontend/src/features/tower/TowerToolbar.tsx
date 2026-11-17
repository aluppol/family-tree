import type { ReactElement } from 'react';
import { Icon, type IconName } from '../../design/components';
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
  return (
    <div role="group" aria-label="Tower controls" className={styles.toolbar}>
      <ToolButton icon="search" label="Search" isPressed={props.isSearchOpen} onClick={props.onSearch} />
      <ToolButton icon="cube" label="Overview" onClick={() => { onPreset('overview'); }} />
      <ToolButton icon="layers" label="Side" onClick={() => { onPreset('side'); }} />
      <ToolButton icon="rings" label="Top" onClick={() => { onPreset('top'); }} />
      <ToolButton icon="chevronLeft" label="Back" isDisabled={!props.canGoBack} onClick={props.onBack} />
      <ToolButton icon="label" label="All names" isPressed={props.isAllNames} onClick={props.onToggleNames} />
      {!props.isNarrow && <ToolButton icon="rotate" label="Rotate" isPressed={props.isRotating} onClick={props.onToggleRotation} />}
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
