import type { PersonSummary } from '../../api/types';
import { formatLifeYears } from '../dates/format';
import { fullName } from '../people/personName';

export const REPEAT_MARK = '↻';

export function shortName(person: PersonSummary): string {
  const [firstGivenName = ''] = person.given_names.trim().split(/\s+/u);
  const name = [firstGivenName, person.surname.trim()].filter((part) => part !== '').join(' ');
  return name === '' ? fullName(person) : name;
}

export function lifeYearsText(person: PersonSummary): string {
  const lifeYears = formatLifeYears(person);
  return lifeYears === '' ? 'Years unknown' : lifeYears;
}
