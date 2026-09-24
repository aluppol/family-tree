import type { ChangeEvent, ReactElement, SubmitEvent } from 'react';
import { Link } from 'react-router';
import type { PersonSummary } from '../../api/types';
import { Avatar, Button, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, PageContainer, PageHeader, TextField } from '../../design/components';
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
  function handleClearSearch(): void {
    onSearchTextChange('');
  }
  return (
    <PageContainer>
      <PageHeader title="People" description="Everyone in your family tree, by surname." actions={<AddPersonLink />} />
      <PeopleSearchForm text={searchText} onTextChange={onSearchTextChange} />
      <p className={styles.status} aria-live="polite">
        {listingAnnouncement(listing, search)}
      </p>
      <PeopleListingView search={search} listing={listing} onClearSearch={handleClearSearch} />
    </PageContainer>
  );
}

function AddPersonLink(): ReactElement {
  return (
    <ButtonLink to={NEW_PERSON_PATH} variant="primary">
      <Icon name="plus" />
      Add person
    </ButtonLink>
  );
}

function PeopleSearchForm({ text, onTextChange }: { text: string; onTextChange: (text: string) => void }): ReactElement {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onTextChange(event.target.value);
  }
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
  }
  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <TextField label="Search people" type="search" value={text} onChange={handleChange} placeholder="Given names or surname" autoComplete="off" />
    </form>
  );
}

interface PeopleListingViewProps {
  search: string;
  listing: PeopleListing;
  onClearSearch: () => void;
}

function PeopleListingView({ search, listing, onClearSearch }: PeopleListingViewProps): ReactElement {
  switch (listing.status) {
    case 'loading':
      return <LoadingState label="Loading people…" />;
    case 'error':
      return <ErrorState error={listing.error} onRetry={listing.onRetry} />;
    case 'ready':
      return listing.people.length === 0 ? <NoPeopleView search={search} onClearSearch={onClearSearch} /> : <FoundPeopleView listing={listing} />;
  }
}

function FoundPeopleView({ listing }: { listing: FoundPeople }): ReactElement {
  return (
    <>
      <ul className={styles.personGrid} aria-label="People in your tree" aria-busy={listing.isRefreshing}>
        {listing.people.map((person) => (
          <li key={person.id}>
            <PersonCardLink person={person} />
          </li>
        ))}
      </ul>
      {listing.hasMore && (
        <div className={styles.loadMore}>
          <Button onClick={listing.onLoadMore} aria-disabled={listing.isLoadingMore}>
            {listing.isLoadingMore ? 'Loading more…' : 'Load more'}
          </Button>
        </div>
      )}
    </>
  );
}

function PersonCardLink({ person }: { person: PersonSummary }): ReactElement {
  const lifeYears = formatLifeYears(person);
  return (
    <Link to={profilePath(person.id)} className={styles.personCard}>
      <Avatar person={person} />
      <span className={styles.personText}>
        <span className={styles.personName}>{fullName(person)}</span>{' '}
        {lifeYears !== '' && <span className={styles.lifeYears}>{lifeYears}</span>}
      </span>
    </Link>
  );
}

function NoPeopleView({ search, onClearSearch }: { search: string; onClearSearch: () => void }): ReactElement {
  if (search !== '') {
    return (
      <EmptyState icon="search" title={`No one matches “${search}”`} actions={<Button onClick={onClearSearch}>Clear search</Button>}>
        <p>Try a different spelling, or search by the surname alone.</p>
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="people" title="No people yet" actions={<EmptyTreeActions />}>
      <p>Add the first person by hand, or import a GEDCOM file from another genealogy program.</p>
    </EmptyState>
  );
}

function EmptyTreeActions(): ReactElement {
  return (
    <>
      <AddPersonLink />
      <ButtonLink to={TRANSFER_PATH}>Import a GEDCOM file</ButtonLink>
    </>
  );
}

function listingAnnouncement(listing: PeopleListing, search: string): string {
  if (listing.status !== 'ready') {
    return '';
  }
  if (listing.isRefreshing) {
    return 'Searching…';
  }
  const shownCount = `${String(listing.people.length)} of ${String(listing.totalCount)}`;
  return search === '' ? `Showing ${shownCount} people.` : `Showing ${shownCount} people matching “${search}”.`;
}
