import { deleteResource, getJson, sendJson } from './client';
import type { PeoplePage, Person, PersonProfile } from './types';

export interface PeoplePageRequest {
  search: string;
  offset: number;
  limit: number;
}

export interface PersonUpdate {
  personId: number;
  profile: PersonProfile;
}

export function fetchPeoplePage({ search, offset, limit }: PeoplePageRequest): Promise<PeoplePage> {
  return getJson<PeoplePage>('/api/people/', { search, offset, limit });
}

export function fetchPerson(personId: number): Promise<Person> {
  return getJson<Person>(personPath(personId));
}

export function createPerson(profile: PersonProfile): Promise<Person> {
  return sendJson<Person>('POST', '/api/people/', profile);
}

export function updatePerson({ personId, profile }: PersonUpdate): Promise<Person> {
  return sendJson<Person>('PUT', personPath(personId), profile);
}

export function deletePerson(personId: number): Promise<void> {
  return deleteResource(personPath(personId));
}

function personPath(personId: number): string {
  return `/api/people/${String(personId)}/`;
}
