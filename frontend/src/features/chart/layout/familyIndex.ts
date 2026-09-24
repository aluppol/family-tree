import type { FamilyChart, GenealogicalDate, ParentLink, ParentLinkKind, Partnership, PersonSummary } from '../../../api/types';

export interface Parentage {
  readonly parent: PersonSummary;
  readonly child: PersonSummary;
  readonly kind: ParentLinkKind;
}

export interface Union {
  readonly id: number;
  readonly partners: readonly [PersonSummary, PersonSummary];
  readonly start: GenealogicalDate | null;
}

export interface FamilyIndex {
  readonly focus: PersonSummary | undefined;
  readonly parentagesByChild: ReadonlyMap<number, readonly Parentage[]>;
  readonly parentagesByParent: ReadonlyMap<number, readonly Parentage[]>;
  readonly unionsByPartner: ReadonlyMap<number, readonly Union[]>;
}

type PeopleById = ReadonlyMap<number, PersonSummary>;

export function indexFamilyChart(chart: FamilyChart): FamilyIndex {
  const people: PeopleById = new Map(chart.people.map((person) => [person.id, person]));
  const parentages = chart.parent_links.flatMap((link) => resolveParentage(people, link));
  const unions = chart.partnerships.flatMap((partnership) => resolveUnion(people, partnership));
  return {
    focus: people.get(chart.focus_id),
    parentagesByChild: groupByKeys(parentages, (parentage) => [parentage.child.id]),
    parentagesByParent: groupByKeys(parentages, (parentage) => [parentage.parent.id]),
    unionsByPartner: groupByKeys(unions, (union) => union.partners.map((partner) => partner.id)),
  };
}

export function parentLinksOf(index: FamilyIndex, child: PersonSummary): readonly Parentage[] {
  return index.parentagesByChild.get(child.id) ?? [];
}

export function childLinksOf(index: FamilyIndex, parent: PersonSummary): readonly Parentage[] {
  return index.parentagesByParent.get(parent.id) ?? [];
}

export function unionsOf(index: FamilyIndex, partner: PersonSummary): readonly Union[] {
  return index.unionsByPartner.get(partner.id) ?? [];
}

export function otherPartnerIn(union: Union, partner: PersonSummary): PersonSummary {
  const [first, second] = union.partners;
  return first.id === partner.id ? second : first;
}

function resolveParentage(people: PeopleById, link: ParentLink): Parentage[] {
  const parent = people.get(link.parent_id);
  const child = people.get(link.child_id);
  if (parent === undefined || child === undefined || parent.id === child.id) {
    return [];
  }
  return [{ parent, child, kind: link.kind }];
}

function resolveUnion(people: PeopleById, partnership: Partnership): Union[] {
  const first = people.get(partnership.first_partner_id);
  const second = people.get(partnership.second_partner_id);
  if (first === undefined || second === undefined || first.id === second.id) {
    return [];
  }
  return [{ id: partnership.id, partners: [first, second], start: partnership.terms.start.date }];
}

function groupByKeys<Entry>(entries: readonly Entry[], keysOf: (entry: Entry) => readonly number[]): Map<number, Entry[]> {
  const groups = new Map<number, Entry[]>();
  for (const entry of entries) {
    for (const key of keysOf(entry)) {
      appendToGroup({ groups, key, entry });
    }
  }
  return groups;
}

function appendToGroup<Entry>({ groups, key, entry }: { groups: Map<number, Entry[]>; key: number; entry: Entry }): void {
  const group = groups.get(key);
  if (group === undefined) {
    groups.set(key, [entry]);
  } else {
    group.push(entry);
  }
}
