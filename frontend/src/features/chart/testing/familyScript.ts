import type { FamilyChart, GenealogicalDate, ParentLinkKind, PersonSummary, Sex } from '../../../api/types';

export type PersonLine = readonly [name: string, sex: Sex, birthYear: number | null];
export type ParentLine = readonly [parent: string, child: string, kind?: ParentLinkKind];
export type PartnerLine = readonly [first: string, second: string, startYear?: number];

export interface FamilyScript {
  readonly focus: string;
  readonly people: readonly PersonLine[];
  readonly parents?: readonly ParentLine[];
  readonly partners?: readonly PartnerLine[];
}

export function familyChart(script: FamilyScript): FamilyChart {
  const idOf = idLookup(script.people);
  return {
    focus_id: idOf(script.focus),
    people: script.people.map(([name, sex, birthYear]) => personSummary({ id: idOf(name), given_names: name, sex, birth_date: yearDate(birthYear) })),
    parent_links: (script.parents ?? []).map(([parent, child, kind = 'birth'], position) => ({
      id: position + 1,
      parent_id: idOf(parent),
      child_id: idOf(child),
      kind,
    })),
    partnerships: (script.partners ?? []).map(([first, second, startYear], position) => ({
      id: position + 1,
      first_partner_id: idOf(first),
      second_partner_id: idOf(second),
      terms: { kind: 'marriage', start: { date: yearDate(startYear ?? null), place: '' }, end: null },
    })),
  };
}

export function personSummary(overrides: Partial<PersonSummary> & Pick<PersonSummary, 'id'>): PersonSummary {
  return {
    given_names: '',
    surname: '',
    sex: 'unknown',
    birth_date: null,
    death_date: null,
    is_deceased: false,
    has_photo: false,
    ...overrides,
  };
}

export function yearDate(year: number | null): GenealogicalDate | null {
  return year === null ? null : { qualifier: 'exact', value: { year, month: null, day: null }, until: null };
}

function idLookup(people: readonly PersonLine[]): (name: string) => number {
  const ids = new Map(people.map(([name], position) => [name, position + 1]));
  return (name) => {
    const id = ids.get(name);
    if (id === undefined) {
      throw new Error(`The family script does not declare ${name}.`);
    }
    return id;
  };
}
