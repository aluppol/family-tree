import type { PersonSummary } from '../../api/types';
import type { Translate } from '../../i18n/translate';

export type NamedPerson = Pick<PersonSummary, 'given_names' | 'surname'>;

export function fullName(t: Translate, person: NamedPerson): string {
  const nameParts = [person.given_names, person.surname].map((part) => part.trim()).filter((part) => part !== '');
  return nameParts.length === 0 ? t('people.unnamed') : nameParts.join(' ');
}
