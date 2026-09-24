import type { PersonSummary } from '../../api/types';
import { formatLifeYears } from '../dates/format';
import { fullName, type NamedPerson } from '../people/personName';
import type { ChartNode } from './layout/types';

export type CardLineTone = 'name' | 'years';

export interface CardLine {
  readonly text: string;
  readonly tone: CardLineTone;
}

export const LINE_LENGTH = 15;

const ELLIPSIS = '…';

export function cardLines(person: PersonSummary): CardLine[] {
  const lifeYears = formatLifeYears(person);
  const names: CardLine[] = nameLines(person).map((text) => ({ text, tone: 'name' }));
  return lifeYears === '' ? names : [...names, { text: lifeYears, tone: 'years' }];
}

export function nameLines(person: NamedPerson): string[] {
  const givenNames = person.given_names.trim();
  const surname = person.surname.trim();
  if (givenNames !== '' && surname !== '') {
    return [truncated(givenNames), truncated(surname)];
  }
  return wrappedOnTwoLines(fullName(person));
}

export function personLabel(node: ChartNode): string {
  const repeatNote = node.isRepeat ? 'also shown elsewhere in this tree' : '';
  return [fullName(node.person), formatLifeYears(node.person), repeatNote].filter((part) => part !== '').join(', ');
}

function wrappedOnTwoLines(text: string): string[] {
  const words = text.split(/\s+/);
  const firstLineWordCount = Math.max(1, wordsFittingOneLine(words));
  const firstLine = truncated(words.slice(0, firstLineWordCount).join(' '));
  const rest = words.slice(firstLineWordCount).join(' ');
  return rest === '' ? [firstLine] : [firstLine, truncated(rest)];
}

function wordsFittingOneLine(words: readonly string[]): number {
  const lineLengths = words.map((_, count) => words.slice(0, count + 1).join(' ').length);
  const overflowing = lineLengths.findIndex((length) => length > LINE_LENGTH);
  return overflowing === -1 ? words.length : overflowing;
}

function truncated(text: string): string {
  return text.length <= LINE_LENGTH ? text : `${text.slice(0, LINE_LENGTH - 1).trimEnd()}${ELLIPSIS}`;
}
