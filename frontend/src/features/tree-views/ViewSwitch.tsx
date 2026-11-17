import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { towerPath, treePath } from '../../routePaths';
import styles from './ViewSwitch.module.scss';

export type TreeViewKind = 'cards' | 'tower';

export interface ViewSwitchProps {
  personId: number;
  current: TreeViewKind;
}

const VIEWS = [
  { kind: 'cards', label: 'Cards', pathOf: treePath },
  { kind: 'tower', label: 'Time tower', pathOf: towerPath },
] as const;

export function ViewSwitch({ personId, current }: ViewSwitchProps): ReactElement {
  return (
    <nav className={styles.switch} aria-label="Tree view">
      {VIEWS.map((view) => (
        <Link key={view.kind} to={view.pathOf(personId)} className={styles.option} aria-current={view.kind === current ? 'page' : undefined}>
          {view.label}
        </Link>
      ))}
    </nav>
  );
}
