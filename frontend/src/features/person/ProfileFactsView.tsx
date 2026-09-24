import type { ReactElement, ReactNode } from 'react';
import type { LifeEvent, Person, Sex } from '../../api/types';
import { CardSection } from '../../design/components';
import { formatGenealogicalDate } from '../dates/format';
import styles from './Profile.module.scss';

const SEX_LABELS: Record<Sex, string> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  unknown: 'Unknown',
};

export function LifeFactsView({ person }: { person: Person }): ReactElement {
  return (
    <CardSection title="Life">
      <dl className={styles.facts}>
        <Fact term="Sex">{SEX_LABELS[person.sex]}</Fact>
        <Fact term="Born">
          <LifeEventText event={person.birth} />
        </Fact>
        {person.death !== null && (
          <Fact term="Died">
            <LifeEventText event={person.death} />
          </Fact>
        )}
      </dl>
    </CardSection>
  );
}

export function BiographyView({ biography }: { biography: string }): ReactElement {
  return (
    <CardSection title="Biography">
      {biography === '' ? <p className={styles.muted}>No biography written yet.</p> : <p className={styles.biography}>{biography}</p>}
    </CardSection>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }): ReactElement {
  return (
    <div className={styles.fact}>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function LifeEventText({ event }: { event: LifeEvent }): ReactElement {
  if (event.date === null && event.place === '') {
    return <span className={styles.muted}>Unknown</span>;
  }
  return (
    <>
      {event.date !== null && <span className={styles.factLine}>{formatGenealogicalDate(event.date)}</span>}
      {event.place !== '' && <span className={styles.factLine}>{event.place}</span>}
    </>
  );
}
