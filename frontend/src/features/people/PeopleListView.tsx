import type { ChangeEvent, ReactElement, SubmitEvent } from 'react';
import { Link } from 'react-router';
import type { PersonSummary } from '../../api/types';
import { Avatar, Button, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, PageContainer, PageHeader, TextField } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import type { Translate } from '../../i18n/translate';
import { NEW_PERSON_PATH, TRANSFER_PATH, profilePath } from '../../routePaths';
import { formatLifeYears } from '../dates/format';
import styles from './PeopleList.module.scss';
import { fullName } from './personName';

export interface FoundPeople {
  status: 'ready';
  people: readonly PersonSummary[];
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  onLoadMore: () => void;
}

export type PeopleListing = { status: 'loading' } | { status: 'error'; error: unknown; onRetry: () => void } | FoundPeople;

export interface PeopleListViewProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  search: string;
  listing: PeopleListing;
}

export function PeopleListView({ searchText, onSearchTextChange, search, listing }: PeopleListViewProps): ReactElement {
  const t = useT();
  function handleClearSearch(): void {
    onSearchTextChange('');
  }
  return (
    <PageContainer>
      <PageHeader title={t('people.title')} description={t('people.description')} actions={<AddPersonLink />} />
      <PeopleSearchForm text={searchText} onTextChange={onSearchTextChange} />
      <p className={styles.status} aria-live="polite">
        {listingAnnouncement(t, listing, search)}
      </p>
      <PeopleListingView search={search} listing={listing} onClearSearch={handleClearSearch} />
    </PageContainer>
  );
}

function AddPersonLink(): ReactElement {
  const t = useT();
  return (
    <ButtonLink to={NEW_PERSON_PATH} variant="primary">
      <Icon name="plus" />
      {t('people.addPerson')}
    </ButtonLink>
  );
}

function PeopleSearchForm({ text, onTextChange }: { text: string; onTextChange: (text: string) => void }): ReactElement {
  const t = useT();
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onTextChange(event.target.value);
  }
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
  }
  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <TextField label={t('people.searchLabel')} type="search" value={text} onChange={handleChange} placeholder={t('people.searchPlaceholder')} autoComplete="off" />
    </form>
  );
}

interface PeopleListingViewProps {
  search: string;
  listing: PeopleListing;
  onClearSearch: () => void;
}

function PeopleListingView({ search, listing, onClearSearch }: PeopleListingViewProps): ReactElement {
  const t = useT();
  switch (listing.status) {
    case 'loading':
      return <LoadingState label={t('people.loading')} />;
    case 'error':
      return <ErrorState error={listing.error} onRetry={listing.onRetry} />;
    case 'ready':
      return listing.people.length === 0 ? <NoPeopleView search={search} onClearSearch={onClearSearch} /> : <FoundPeopleView listing={listing} />;
  }
}

function FoundPeopleView({ listing }: { listing: FoundPeople }): ReactElement {
  const t = useT();
  return (
    <>
      <ul className={styles.personGrid} aria-label={t('people.listLabel')} aria-busy={listing.isRefreshing}>
        {listing.people.map((person) => (
          <li key={person.id}>
            <PersonCardLink person={person} />
          </li>
        ))}
      </ul>
      {listing.hasMore && (
        <div className={styles.loadMore}>
          <Button onClick={listing.onLoadMore} aria-disabled={listing.isLoadingMore}>
            {listing.isLoadingMore ? t('people.loadingMore') : t('people.loadMore')}
          </Button>
        </div>
      )}
    </>
  );
}

function PersonCardLink({ person }: { person: PersonSummary }): ReactElement {
  const t = useT();
  const lifeYears = formatLifeYears(t, person);
  return (
    <Link to={profilePath(person.id)} className={styles.personCard}>
      <Avatar person={person} />
      <span className={styles.personText}>
        <span className={styles.personName}>{fullName(t, person)}</span>{' '}
        {lifeYears !== '' && <span className={styles.lifeYears}>{lifeYears}</span>}
      </span>
    </Link>
  );
}

function NoPeopleView({ search, onClearSearch }: { search: string; onClearSearch: () => void }): ReactElement {
  const t = useT();
  if (search !== '') {
    return (
      <EmptyState icon="search" title={t('people.noMatchTitle', { search })} actions={<Button onClick={onClearSearch}>{t('people.clearSearch')}</Button>}>
        <p>{t('people.noMatchMessage')}</p>
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="people" title={t('people.emptyTitle')} actions={<EmptyTreeActions />}>
      <p>{t('people.emptyMessage')}</p>
    </EmptyState>
  );
}

function EmptyTreeActions(): ReactElement {
  const t = useT();
  return (
    <>
      <AddPersonLink />
      <ButtonLink to={TRANSFER_PATH}>{t('people.importGedcom')}</ButtonLink>
    </>
  );
}

function listingAnnouncement(t: Translate, listing: PeopleListing, search: string): string {
  if (listing.status !== 'ready') {
    return '';
  }
  if (listing.isRefreshing) {
    return t('common.searching');
  }
  const counts = { shown: listing.people.length, count: listing.totalCount };
  return search === '' ? t('people.showing', counts) : t('people.showingMatches', { ...counts, search });
}
