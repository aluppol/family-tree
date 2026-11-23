import type { ReactElement } from 'react';
import type { PersonSummary } from '../../api/types';
import { Button } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { fullName } from '../people/personName';
import { relationWord } from './relationPath';
import styles from './TowerPage.module.scss';
import type { RelationLink, RelationView } from './useTowerExplorer';

export interface RelationCardProps {
  person: PersonSummary;
  relation: RelationView;
  onSelect: (personId: number) => void;
  onClear: () => void;
}

export function RelationCard({ person, relation, onSelect, onClear }: RelationCardProps): ReactElement {
  const t = useT();
  const names = { from: fullName(t, person), to: fullName(t, relation.target) };
  return (
    <section className={styles.relationCard} aria-label={t('tower.relationLabel', names)}>
      <p className={styles.relationTitle}>{t('tower.relationTitle', names)}</p>
      <RelationLinks links={relation.links} onSelect={onSelect} />
      <Button size="small" variant="ghost" onClick={onClear}>
        {t('tower.clearPath')}
      </Button>
    </section>
  );
}

function RelationLinks({ links, onSelect }: { links: readonly RelationLink[] | null; onSelect: (personId: number) => void }): ReactElement {
  const t = useT();
  if (links === null) {
    return <p className={styles.relationNote}>{t('tower.notConnected')}</p>;
  }
  if (links.length === 0) {
    return <p className={styles.relationNote}>{t('tower.samePerson')}</p>;
  }
  return (
    <ol className={styles.relationSteps}>
      {links.map((link) => (
        <li key={link.person.id}>
          <button type="button" className={styles.relativeButton} onClick={() => { onSelect(link.person.id); }}>
            <span className={styles.relativeYears}>{relationWord(t, link.relation, link.person.sex)}</span>
            <span className={styles.relativeName}>{fullName(t, link.person)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
