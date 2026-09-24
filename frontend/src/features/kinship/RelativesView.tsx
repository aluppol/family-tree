import { type ReactElement, type RefObject, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { PersonSummary } from '../../api/types';
import { Avatar, Badge, Button, CardSection, Icon } from '../../design/components';
import { profilePath } from '../../routePaths';
import { formatLifeYears } from '../dates/format';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';

export interface RelativeEntry {
  key: number;
  person: PersonSummary;
  badge?: string;
  detail?: string;
  onEdit: () => void;
  onRemove: () => void;
}

export interface RelativesViewProps {
  title: string;
  addLabel: string;
  emptyText: string;
  editLabel: string;
  entries: readonly RelativeEntry[];
  onAdd: () => void;
}

export function RelativesView({ title, addLabel, emptyText, editLabel, entries, onAdd }: RelativesViewProps): ReactElement {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  useFocusRescueAfterRemoval(entries.length, addButtonRef);
  const addButton = (
    <Button ref={addButtonRef} size="small" onClick={onAdd}>
      <Icon name="plus" />
      {addLabel}
    </Button>
  );
  return (
    <CardSection title={title} actions={addButton}>
      {entries.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.relatives}>
          {entries.map((entry) => (
            <RelativeRow key={entry.key} entry={entry} editLabel={editLabel} />
          ))}
        </ul>
      )}
    </CardSection>
  );
}

function RelativeRow({ entry, editLabel }: { entry: RelativeEntry; editLabel: string }): ReactElement {
  const name = fullName(entry.person);
  const lifeYears = formatLifeYears(entry.person);
  return (
    <li className={styles.relative}>
      <Avatar person={entry.person} size="small" />
      <div className={styles.relativeText}>
        <Link to={profilePath(entry.person.id)} className={styles.relativeName}>
          {name}
        </Link>
        <span className={styles.relativeMeta}>
          {lifeYears !== '' && <span>{lifeYears}</span>}
          {entry.badge !== undefined && <Badge tone="caution">{entry.badge}</Badge>}
        </span>
        {entry.detail !== undefined && <span className={styles.relativeDetail}>{entry.detail}</span>}
      </div>
      <RelativeActions name={name} editLabel={editLabel} entry={entry} />
    </li>
  );
}

function RelativeActions({ name, editLabel, entry }: { name: string; editLabel: string; entry: RelativeEntry }): ReactElement {
  return (
    <div className={styles.relativeActions}>
      <Button variant="ghost" size="small" onClick={entry.onEdit}>
        {editLabel}{' '}
        <span className="visually-hidden">{name}</span>
      </Button>
      <Button variant="ghost" size="small" onClick={entry.onRemove}>
        Remove{' '}
        <span className="visually-hidden">{name}</span>
      </Button>
    </div>
  );
}

function useFocusRescueAfterRemoval(entryCount: number, target: RefObject<HTMLElement | null>): void {
  const previousCount = useRef(entryCount);
  useEffect(() => {
    const hasLostAnEntry = entryCount < previousCount.current;
    previousCount.current = entryCount;
    if (hasLostAnEntry && document.activeElement === document.body) {
      target.current?.focus();
    }
  }, [entryCount, target]);
}
