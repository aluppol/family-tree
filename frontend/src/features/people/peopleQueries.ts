import { type InfiniteData, type UseInfiniteQueryResult, type UseQueryResult, keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchPeoplePage } from '../../api/people';
import { firstPersonKey, peopleSearchKey } from '../../api/queryCache';
import type { PeoplePage, PersonSummary } from '../../api/types';

const PEOPLE_PAGE_SIZE = 50;

export function usePeopleSearch(search: string): UseInfiniteQueryResult<InfiniteData<PeoplePage, number>> {
  return useInfiniteQuery({
    queryKey: peopleSearchKey(search),
    queryFn: ({ pageParam }) => fetchPeoplePage({ search, offset: pageParam, limit: PEOPLE_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export function useFirstPerson(): UseQueryResult<PersonSummary | null> {
  return useQuery({ queryKey: firstPersonKey(), queryFn: fetchFirstPerson });
}

async function fetchFirstPerson(): Promise<PersonSummary | null> {
  const firstPage = await fetchPeoplePage({ search: '', offset: 0, limit: 1 });
  return firstPage.results[0] ?? null;
}
