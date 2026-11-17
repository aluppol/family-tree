import { type ReactElement, useId } from 'react';
import type { PersonSummary } from '../../api/types';
import { Button, ButtonLink, Icon } from '../../design/components';
import { profilePath, treePath } from '../../routePaths';
import { fullName } from '../people/personName';
import type { NodeTone, TowerNode } from './layout/towerTypes';
import { RelationCard } from './RelationCard';
import { lifeYearsText, REPEAT_MARK } from './towerText';
import styles from './TowerPage.module.scss';
import type { RelationView } from './useTowerExplorer';
import { ToneSwatch, toneName } from './ToneSwatch';

export interface Relatives {
  readonly parents: readonly PersonSummary[];
  readonly spouses: readonly PersonSummary[];
  readonly children: readonly PersonSummary[];
}

export interface PersonPanelProps {
  node: TowerNode;
  relatives: Relatives;
  lineHeads: ReadonlyMap<number, PersonSummary>;
  relation: RelationView | null;
  onSelect: (personId: number) => void;
  onAskRelation: () => void;
  onClearRelation: () => void;
}

export function PersonPanel({ node, relatives, lineHeads, relation, onSelect, onAskRelation, onClearRelation }: PersonPanelProps): ReactElement {
  const { person } = node;
  return (
    <div className={styles.personPanel}>
      <h2 className={styles.personName}>{fullName(person)}</h2>
      <p className={styles.personFacts}>
        {lifeYearsText(person)} · Generation {node.generation + 1}
      </p>
      <PersonNotes node={node} lineHead={lineHeadOf(node.tone, lineHeads)} />
      <div className={styles.personActions}>
        <ButtonLink to={profilePath(person.id)} size="small">
          <Icon name="person" />
          Profile
        </ButtonLink>
        <ButtonLink to={treePath(person.id)} size="small">
          <Icon name="tree" />
          Open in cards
        </ButtonLink>
        <Button size="small" onClick={onAskRelation}>
          <Icon name="people" />
          Relationship to…
        </Button>
      </div>
      {relation !== null && <RelationCard person={person} relation={relation} onSelect={onSelect} onClear={onClearRelation} />}
      <RelativeGroup title="Parents" people={relatives.parents} onSelect={onSelect} />
      <RelativeGroup title="Spouses" people={relatives.spouses} onSelect={onSelect} />
      <RelativeGroup title="Children" people={relatives.children} onSelect={onSelect} />
    </div>
  );
}

function PersonNotes({ node, lineHead }: { node: TowerNode; lineHead: PersonSummary | undefined }): ReactElement {
  return (
    <ul className={styles.personNotes}>
      <li>
        <ToneSwatch tone={node.tone} isHollow={node.isEstimated} />
        {toneName(node.tone, lineHead)}
      </li>
      {node.isEstimated && <li>Birth year estimated from relatives</li>}
      {node.isRepeat && <li>{REPEAT_MARK} Parents are related to each other</li>}
    </ul>
  );
}

function RelativeGroup({ title, people, onSelect }: { title: string; people: readonly PersonSummary[]; onSelect: (personId: number) => void }): ReactElement | null {
  const headingId = useId();
  if (people.length === 0) {
    return null;
  }
  return (
    <section className={styles.relativeGroup} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.relativeTitle}>
        {title}
      </h3>
      <ul className={styles.relativeList}>
        {people.map((relative) => (
          <li key={relative.id}>
            <button type="button" className={styles.relativeButton} onClick={() => { onSelect(relative.id); }}>
              <span className={styles.relativeName}>{fullName(relative)}</span>
              <span className={styles.relativeYears}>{lifeYearsText(relative)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function lineHeadOf(tone: NodeTone, lineHeads: ReadonlyMap<number, PersonSummary>): PersonSummary | undefined {
  return tone.kind === 'line' ? lineHeads.get(tone.lineIndex) : undefined;
}
