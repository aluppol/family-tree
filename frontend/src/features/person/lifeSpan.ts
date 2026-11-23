import type { Person } from '../../api/types';
import type { Translate } from '../../i18n/translate';
import { formatLifeYears } from '../dates/format';

export function lifeSpanOf(t: Translate, person: Person): string {
  return formatLifeYears(t, { birth_date: person.birth.date, death_date: person.death?.date ?? null, is_deceased: person.death !== null });
}
