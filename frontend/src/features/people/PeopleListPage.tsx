import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import type { PeoplePage } from '../../api/types';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { type PeopleListing, PeopleListView } from './PeopleListView';
import { usePeopleSearch } from './peopleQueries';
import { useSearchText } from './useSearchText';

export function PeopleListPage(): ReactElement {
  useDocumentTitle('People');
  const searchText = useSearchText();
  const peopleQuery = usePeopleSearch(searchText.search);
  return (
    <PeopleListView
      searchText={searchText.text}
      onSearchTextChange={searchText.onTextChange}
      search={searchText.search}
      listing={peopleListingOf(peopleQuery)}
    />
  );
}

function peopleListingOf(peopleQuery: UseInfiniteQueryResult<InfiniteData<PeoplePage, number>>): PeopleListing {
  if (peopleQuery.isPending) {
    return { status: 'loading' };
  }
  if (peopleQuery.isError) {
    return { status: 'error', error: peopleQuery.error, onRetry: () => void peopleQuery.refetch() };
  }
  return {
    status: 'ready',
    people: peopleQuery.data.pages.flatMap((page) => page.results),
    totalCount: peopleQuery.data.pages[0]?.count ?? 0,
    hasMore: peopleQuery.hasNextPage,
    isLoadingMore: peopleQuery.isFetchingNextPage,
    isRefreshing: peopleQuery.isPlaceholderData,
    onLoadMore: () => void peopleQuery.fetchNextPage(),
  };
}
