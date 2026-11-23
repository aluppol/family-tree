import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { useT } from '../../i18n/languageContext';
import { towerPath, treePath } from '../../routePaths';
import styles from './ViewSwitch.module.scss';

export type TreeViewKind = 'cards' | 'tower';

export interface ViewSwitchProps {
  personId: number;
  current: TreeViewKind;
}

const VIEWS = [
  { kind: 'tower', labelKey: 'treeViews.tower', pathOf: towerPath },
  { kind: 'cards', labelKey: 'treeViews.cards', pathOf: treePath },
] as const;

export function ViewSwitch({ personId, current }: ViewSwitchProps): ReactElement {
  const t = useT();
  return (
    <nav className={styles.switch} aria-label={t('treeViews.label')}>
      {VIEWS.map((view) => (
        <Link key={view.kind} to={view.pathOf(personId)} className={styles.option} aria-current={view.kind === current ? 'page' : undefined}>
          {t(view.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
