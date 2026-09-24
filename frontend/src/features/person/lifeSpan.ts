import type { Person } from '../../api/types';
import { formatLifeYears } from '../dates/format';

export function lifeSpanOf(person: Person): string {
  return formatLifeYears({ birth_date: person.birth.date, death_date: person.death?.date ?? null, is_deceased: person.death !== null });
}
