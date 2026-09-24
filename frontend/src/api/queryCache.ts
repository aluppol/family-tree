import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const VIEWER_KEY: QueryKey = ['viewer'];
export const WORKSPACE_KEY: QueryKey = ['workspace'];
export const CHARTS_KEY: QueryKey = ['chart'];

const PEOPLE_LISTS_KEY: QueryKey = ['people'];
const PERSONS_KEY: QueryKey = ['person'];
const CANDIDATES_KEY: QueryKey = ['candidates'];

export type CandidateList = 'parents' | 'children' | 'partners';

export interface CandidatesKeyParts {
  list: CandidateList;
  personId: number;
  search: string;
}

export function peopleSearchKey(search: string): QueryKey {
  return [...PEOPLE_LISTS_KEY, 'search', search];
}

export function firstPersonKey(): QueryKey {
  return [...PEOPLE_LISTS_KEY, 'first'];
}

export function personKey(personId: number): QueryKey {
  return [...PERSONS_KEY, personId];
}

export function candidatesKey({ list, personId, search }: CandidatesKeyParts): QueryKey {
  return [...CANDIDATES_KEY, list, personId, search];
}

export async function refreshPeople(queryClient: QueryClient, personIds: readonly number[]): Promise<void> {
  const uniqueIds = [...new Set(personIds)];
  await Promise.all(uniqueIds.map((personId) => queryClient.invalidateQueries({ queryKey: personKey(personId) })));
}

export async function refreshFamilyViews(queryClient: QueryClient): Promise<void> {
  const familyViewKeys = [PEOPLE_LISTS_KEY, CANDIDATES_KEY, CHARTS_KEY, WORKSPACE_KEY];
  await Promise.all(familyViewKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function markPersonGone(queryClient: QueryClient, personId: number): void {
  void queryClient.invalidateQueries({ queryKey: personKey(personId), refetchType: 'none' });
}
