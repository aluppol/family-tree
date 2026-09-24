import { type QueryClient, type UseMutationResult, type UseQueryResult, keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CandidateSearch,
  type ParentLinkKindChange,
  type PartnershipTermsChange,
  changeParentLinkKind,
  changePartnershipTerms,
  createParentLink,
  createPartnership,
  removeParentLink,
  removePartnership,
} from '../../api/kinship';
import { type CandidateList, candidatesKey, refreshFamilyViews, refreshPeople } from '../../api/queryCache';
import type { ParentLink, ParentLinkInput, Partnership, PartnershipInput, PersonSummary } from '../../api/types';

export interface ParentLinkRemoval {
  linkId: number;
  personIds: readonly number[];
}

export interface PartnershipRemoval {
  partnershipId: number;
  personIds: readonly number[];
}

export interface CandidateSource {
  list: CandidateList;
  fetchCandidates: (search: CandidateSearch) => Promise<PersonSummary[]>;
}

export function useCandidates(source: CandidateSource, search: CandidateSearch): UseQueryResult<PersonSummary[]> {
  return useQuery({
    queryKey: candidatesKey({ list: source.list, ...search }),
    queryFn: () => source.fetchCandidates(search),
    placeholderData: keepPreviousData,
  });
}

export function useCreateParentLink(): UseMutationResult<ParentLink, Error, ParentLinkInput> {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createParentLink, onSuccess: (link) => refreshKinship(queryClient, [link.parent_id, link.child_id]) });
}

export function useChangeParentLinkKind(): UseMutationResult<ParentLink, Error, ParentLinkKindChange> {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: changeParentLinkKind, onSuccess: (link) => refreshKinship(queryClient, [link.parent_id, link.child_id]) });
}

export function useRemoveParentLink(): UseMutationResult<void, Error, ParentLinkRemoval> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId }) => removeParentLink(linkId),
    onSuccess: (_nothing, { personIds }) => refreshKinship(queryClient, personIds),
  });
}

export function useCreatePartnership(): UseMutationResult<Partnership, Error, PartnershipInput> {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createPartnership, onSuccess: (partnership) => refreshKinship(queryClient, partnerIds(partnership)) });
}

export function useChangePartnershipTerms(): UseMutationResult<Partnership, Error, PartnershipTermsChange> {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: changePartnershipTerms, onSuccess: (partnership) => refreshKinship(queryClient, partnerIds(partnership)) });
}

export function useRemovePartnership(): UseMutationResult<void, Error, PartnershipRemoval> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partnershipId }) => removePartnership(partnershipId),
    onSuccess: (_nothing, { personIds }) => refreshKinship(queryClient, personIds),
  });
}

async function refreshKinship(queryClient: QueryClient, personIds: readonly number[]): Promise<void> {
  await Promise.all([refreshPeople(queryClient, personIds), refreshFamilyViews(queryClient)]);
}

function partnerIds(partnership: Partnership): number[] {
  return [partnership.first_partner_id, partnership.second_partner_id];
}
