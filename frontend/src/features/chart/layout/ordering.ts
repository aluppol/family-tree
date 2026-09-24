import type { GenealogicalDate, ParentLinkKind, PersonSummary, Sex } from '../../../api/types';

export type SortKey = readonly number[];

const SEX_RANKS: Record<Sex, number> = { male: 0, other: 1, unknown: 1, female: 2 };

export function sortedBy<Entry>(entries: readonly Entry[], keyOf: (entry: Entry) => SortKey): Entry[] {
  return entries
    .map((entry) => ({ entry, key: keyOf(entry) }))
    .sort((first, second) => compareSortKeys(first.key, second.key))
    .map(({ entry }) => entry);
}

export function distinctBy<Entry>(entries: readonly Entry[], identityOf: (entry: Entry) => number): Entry[] {
  return entries.filter(
    (entry, position) => entries.findIndex((other) => identityOf(other) === identityOf(entry)) === position,
  );
}

export function birthOrderKey(person: PersonSummary): SortKey {
  return [dateSortValue(person.birth_date), person.id];
}

export function dateSortValue(date: GenealogicalDate | null): number {
  if (date === null) {
    return Number.POSITIVE_INFINITY;
  }
  const { year, month, day } = date.value;
  return year * 10_000 + (month ?? 0) * 100 + (day ?? 0);
}

export function sexRank(sex: Sex): number {
  return SEX_RANKS[sex];
}

export function kindRank(kind: ParentLinkKind): number {
  return kind === 'birth' ? 0 : 1;
}

function compareSortKeys(first: SortKey, second: SortKey): number {
  for (let position = 0; position < first.length; position += 1) {
    const value = first[position] ?? 0;
    const other = second[position] ?? 0;
    if (value !== other) {
      return value < other ? -1 : 1;
    }
  }
  return 0;
}
