import { type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type PersonUpdate, createPerson, deletePerson, fetchPerson, updatePerson } from '../../api/people';
import { markPersonGone, personKey, refreshFamilyViews, refreshPeople } from '../../api/queryCache';
import type { Person, PersonProfile } from '../../api/types';
import { relativeIds } from './relativeIds';

export function usePerson(personId: number): UseQueryResult<Person> {
  return useQuery({ queryKey: personKey(personId), queryFn: () => fetchPerson(personId) });
}

export function useCreatePerson(): UseMutationResult<Person, Error, PersonProfile> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPerson,
    onSuccess: async (person) => {
      queryClient.setQueryData(personKey(person.id), person);
      await refreshFamilyViews(queryClient);
    },
  });
}

export function useUpdatePerson(): UseMutationResult<Person, Error, PersonUpdate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePerson,
    onSuccess: async (person) => {
      queryClient.setQueryData(personKey(person.id), person);
      await Promise.all([refreshPeople(queryClient, relativeIds(person)), refreshFamilyViews(queryClient)]);
    },
  });
}

export function useDeletePerson(): UseMutationResult<void, Error, Person> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (person) => deletePerson(person.id),
    onSuccess: async (_nothing, person) => {
      markPersonGone(queryClient, person.id);
      await Promise.all([refreshPeople(queryClient, relativeIds(person)), refreshFamilyViews(queryClient)]);
    },
  });
}
