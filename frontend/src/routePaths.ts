export const HOME_PATH = '/';
export const PEOPLE_PATH = '/people';
export const NEW_PERSON_PATH = '/people/new';
export const TRANSFER_PATH = '/transfer';

export function treePath(personId: number): string {
  return `/tree/${String(personId)}`;
}

export function profilePath(personId: number): string {
  return `/people/${String(personId)}`;
}

export function editProfilePath(personId: number): string {
  return `/people/${String(personId)}/edit`;
}
