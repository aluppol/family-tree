import type { PersonSummary } from '../../api/types';

export type NamedPerson = Pick<PersonSummary, 'given_names' | 'surname'>;

export function fullName(person: NamedPerson): string {
  const nameParts = [person.given_names, person.surname].map((part) => part.trim()).filter((part) => part !== '');
  return nameParts.length === 0 ? 'Unnamed person' : nameParts.join(' ');
}
