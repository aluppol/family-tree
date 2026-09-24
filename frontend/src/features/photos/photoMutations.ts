import { type QueryClient, type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { markPhotoRevised, removePhoto, uploadPhoto } from '../../api/photos';
import { refreshFamilyViews, refreshPeople } from '../../api/queryCache';
import type { Person } from '../../api/types';
import { relativeIds } from '../person/relativeIds';

export interface PhotoUpload {
  person: Person;
  photo: Blob;
}

export function useUploadPhoto(): UseMutationResult<void, Error, PhotoUpload> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ person, photo }) => uploadPhoto({ personId: person.id, photo }),
    onSuccess: (_nothing, { person }) => {
      markPhotoRevised(person.id);
      return refreshPhotoViews(queryClient, person);
    },
  });
}

export function useRemovePhoto(): UseMutationResult<void, Error, Person> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (person) => removePhoto(person.id),
    onSuccess: (_nothing, person) => refreshPhotoViews(queryClient, person),
  });
}

async function refreshPhotoViews(queryClient: QueryClient, person: Person): Promise<void> {
  await Promise.all([refreshPeople(queryClient, [person.id, ...relativeIds(person)]), refreshFamilyViews(queryClient)]);
}
