import type { PersonSummary } from '../../api/types';
import type { Translate } from '../../i18n/translate';
import { fullName } from '../people/personName';

const FOLDED_LETTERS: Readonly<Record<string, string>> = { đ: 'd', ł: 'l', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ı: 'i' };

export interface PeopleSearch {
  readonly people: readonly PersonSummary[];
  readonly query: string;
  readonly limit: number;
}

interface SearchablePerson {
  readonly person: PersonSummary;
  readonly name: string;
}

export function foldForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[đłøæœßı]/gu, (letter) => FOLDED_LETTERS[letter] ?? letter);
}

export function searchPeople(t: Translate, { people, query, limit }: PeopleSearch): PersonSummary[] {
  const words = foldForSearch(query).split(/\s+/u).filter((word) => word !== '');
  if (words.length === 0) {
    return [];
  }
  const searchable: SearchablePerson[] = people.map((person) => ({ person, name: foldForSearch(fullName(t, person)) }));
  return searchable
    .filter(({ name }) => words.every((word) => name.includes(word)))
    .sort((first, second) => rankOf(first, words) - rankOf(second, words) || first.name.localeCompare(second.name))
    .slice(0, limit)
    .map(({ person }) => person);
}

function rankOf({ name }: SearchablePerson, words: readonly string[]): number {
  const [firstWord = ''] = words;
  if (name.startsWith(firstWord)) {
    return 0;
  }
  return name.split(/\s+/u).some((part) => part.startsWith(firstWord)) ? 1 : 2;
}
