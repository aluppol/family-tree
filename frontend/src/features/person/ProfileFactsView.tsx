import type { ReactElement, ReactNode } from 'react';
import type { LifeEvent, Person } from '../../api/types';
import { CardSection } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { formatGenealogicalDate } from '../dates/format';
import styles from './Profile.module.scss';

export function LifeFactsView({ person }: { person: Person }): ReactElement {
  const t = useT();
  return (
    <CardSection title={t('profile.lifeSection')}>
      <dl className={styles.facts}>
        <Fact term={t('profile.sex')}>{t(`sex.${person.sex}`)}</Fact>
        <Fact term={t('profile.born')}>
          <LifeEventText event={person.birth} />
        </Fact>
        {person.death !== null && (
          <Fact term={t('profile.died')}>
            <LifeEventText event={person.death} />
          </Fact>
        )}
      </dl>
    </CardSection>
  );
}

export function BiographyView({ biography }: { biography: string }): ReactElement {
  const t = useT();
  return (
    <CardSection title={t('profile.biographySection')}>
      {biography === '' ? <p className={styles.muted}>{t('profile.noBiography')}</p> : <p className={styles.biography}>{biography}</p>}
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
  const t = useT();
  if (event.date === null && event.place === '') {
    return <span className={styles.muted}>{t('common.unknown')}</span>;
  }
  return (
    <>
      {event.date !== null && <span className={styles.factLine}>{formatGenealogicalDate(t, event.date)}</span>}
      {event.place !== '' && <span className={styles.factLine}>{event.place}</span>}
    </>
  );
}
