import { buildUrl, deleteResource, putBinary } from './client';

const photoRevisions = new Map<number, number>();
const revisionListeners = new Set<() => void>();

export function photoUrl(personId: number): string {
  return buildUrl(photoPath(personId), { revision: photoRevisions.get(personId) });
}

export function subscribeToPhotoRevisions(listener: () => void): () => void {
  revisionListeners.add(listener);
  return () => {
    revisionListeners.delete(listener);
  };
}

export function markPhotoRevised(personId: number): void {
  photoRevisions.set(personId, (photoRevisions.get(personId) ?? 0) + 1);
  for (const listener of revisionListeners) {
    listener();
  }
}

export async function uploadPhoto({ personId, photo }: { personId: number; photo: Blob }): Promise<void> {
  await putBinary(photoPath(personId), photo);
}

export async function removePhoto(personId: number): Promise<void> {
  await deleteResource(photoPath(personId));
}

function photoPath(personId: number): string {
  return `/api/people/${String(personId)}/photo/`;
}
