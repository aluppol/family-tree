import type { ReactElement } from 'react';
import type { PersonSummary } from '../../api/types';
import { Button } from '../../design/components';
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
  return (
    <section className={styles.relationCard} aria-label={`How ${fullName(person)} is related to ${fullName(relation.target)}`}>
      <p className={styles.relationTitle}>
        From {fullName(person)} to {fullName(relation.target)}
      </p>
      <RelationLinks links={relation.links} onSelect={onSelect} />
      <Button size="small" variant="ghost" onClick={onClear}>
        Clear the path
      </Button>
    </section>
  );
}

function RelationLinks({ links, onSelect }: { links: readonly RelationLink[] | null; onSelect: (personId: number) => void }): ReactElement {
  if (links === null) {
    return <p className={styles.relationNote}>They are not connected in this tree.</p>;
  }
  if (links.length === 0) {
    return <p className={styles.relationNote}>This is the same person.</p>;
  }
  return (
    <ol className={styles.relationSteps}>
      {links.map((link) => (
        <li key={link.person.id}>
          <button type="button" className={styles.relativeButton} onClick={() => { onSelect(link.person.id); }}>
            <span className={styles.relativeYears}>{relationWord(link.relation, link.person.sex)}</span>
            <span className={styles.relativeName}>{fullName(link.person)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
