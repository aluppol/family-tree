import { useSyncExternalStore } from 'react';

export interface TowerPanels {
  readonly isKeyOpen: boolean;
  readonly isDetailsOpen: boolean;
}

export const DEFAULT_TOWER_PANELS: TowerPanels = { isKeyOpen: false, isDetailsOpen: true };

const listeners = new Set<() => void>();
let rememberedPanels = DEFAULT_TOWER_PANELS;

export function useTowerPanels(): TowerPanels {
  return useSyncExternalStore(subscribe, readPanels);
}

export function rememberTowerPanels(panels: TowerPanels): void {
  rememberedPanels = panels;
  for (const listener of listeners) {
    listener();
  }
}

export function toggleTowerKey(): void {
  rememberTowerPanels({ ...rememberedPanels, isKeyOpen: !rememberedPanels.isKeyOpen });
}

export function toggleTowerDetails(): void {
  rememberTowerPanels({ ...rememberedPanels, isDetailsOpen: !rememberedPanels.isDetailsOpen });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readPanels(): TowerPanels {
  return rememberedPanels;
}
