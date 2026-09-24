import type { FamilyChart, ParentLink, ParentLinkKind, Partnership, PersonSummary, Sex } from '../../../api/types';
import { personSummary, yearDate } from './familyScript';

export interface GeneratorSettings {
  readonly seed: number;
  readonly ancestorGenerations: number;
  readonly descendantGenerations: number;
  readonly maxPartners: number;
  readonly maxChildren: number;
}

interface Draft {
  readonly random: () => number;
  readonly settings: GeneratorSettings;
  readonly people: PersonSummary[];
  readonly links: ParentLink[];
  readonly partnerships: Partnership[];
  readonly ancestorsByGeneration: Map<number, PersonSummary[]>;
}

const GENERATION_YEARS = 28;
const PARENT_SEXES: readonly Sex[] = ['male', 'female'];

export function generatedFamily(settings: GeneratorSettings): FamilyChart {
  const draft: Draft = { random: seededRandom(settings.seed), settings, people: [], links: [], partnerships: [], ancestorsByGeneration: new Map() };
  const focus = addPerson(draft, { sex: 'male', birthYear: 1900 });
  addAncestors(draft, focus, 1);
  addDescendants(draft, focus, 1);
  return { focus_id: focus.id, people: draft.people, parent_links: draft.links, partnerships: draft.partnerships };
}

export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function addAncestors(draft: Draft, child: PersonSummary, depth: number): void {
  if (depth > draft.settings.ancestorGenerations) {
    return;
  }
  const parents = PARENT_SEXES.flatMap((sex) => (draft.random() < 0.85 ? [ancestorFor(draft, { sex, depth })] : []));
  for (const { person } of parents) {
    addLink(draft, { parent: person, child, kind: draft.random() < 0.08 ? 'adopted' : 'birth' });
  }
  const [father, mother] = parents;
  if (father !== undefined && mother !== undefined && draft.random() < 0.8) {
    addPartnership(draft, father.person, mother.person);
  }
  for (const { person, isNew } of parents) {
    if (isNew) {
      addAncestors(draft, person, depth + 1);
    }
  }
}

function ancestorFor(draft: Draft, { sex, depth }: { sex: Sex; depth: number }): { person: PersonSummary; isNew: boolean } {
  const generation = draft.ancestorsByGeneration.get(depth) ?? [];
  const sameSex = generation.filter((ancestor) => ancestor.sex === sex);
  const reused = sameSex[Math.floor(draft.random() * sameSex.length)];
  if (reused !== undefined && draft.random() < 0.06) {
    return { person: reused, isNew: false };
  }
  const person = addPerson(draft, { sex, birthYear: 1900 - depth * GENERATION_YEARS - Math.floor(draft.random() * 8) });
  draft.ancestorsByGeneration.set(depth, [...generation, person]);
  return { person, isNew: true };
}

function addDescendants(draft: Draft, parent: PersonSummary, depth: number): void {
  if (depth > draft.settings.descendantGenerations) {
    return;
  }
  const partnerCount = Math.floor(draft.random() * (draft.settings.maxPartners + 1));
  const coParents = Array.from({ length: partnerCount }, () => addPartner(draft, parent));
  for (const coParent of [...coParents, undefined]) {
    const childCount = Math.floor(draft.random() * (draft.settings.maxChildren + 1));
    for (let position = 0; position < childCount; position += 1) {
      addDescendants(draft, addChild(draft, { parent, coParent, depth }), depth + 1);
    }
  }
}

function addPartner(draft: Draft, person: PersonSummary): PersonSummary {
  const partner = addPerson(draft, { sex: person.sex === 'male' ? 'female' : 'male', birthYear: birthYearOf(person) + 2 });
  addPartnership(draft, person, partner);
  return partner;
}

function addChild(draft: Draft, { parent, coParent, depth }: { parent: PersonSummary; coParent: PersonSummary | undefined; depth: number }): PersonSummary {
  const knowsBirth = draft.random() < 0.9;
  const child = addPerson(draft, {
    sex: draft.random() < 0.5 ? 'male' : 'female',
    birthYear: knowsBirth ? 1900 + depth * GENERATION_YEARS + Math.floor(draft.random() * 15) : null,
  });
  const kind: ParentLinkKind = draft.random() < 0.1 ? 'adopted' : 'birth';
  for (const childParent of coParent === undefined ? [parent] : [parent, coParent]) {
    addLink(draft, { parent: childParent, child, kind });
  }
  return child;
}

function addPerson(draft: Draft, { sex, birthYear }: { sex: Sex; birthYear: number | null }): PersonSummary {
  const id = draft.people.length + 1;
  const person = personSummary({ id, given_names: `Person ${String(id)}`, sex, birth_date: yearDate(birthYear) });
  draft.people.push(person);
  return person;
}

function addLink(draft: Draft, { parent, child, kind }: { parent: PersonSummary; child: PersonSummary; kind: ParentLinkKind }): void {
  draft.links.push({ id: draft.links.length + 1, parent_id: parent.id, child_id: child.id, kind });
}

function addPartnership(draft: Draft, first: PersonSummary, second: PersonSummary): void {
  draft.partnerships.push({
    id: draft.partnerships.length + 1,
    first_partner_id: first.id,
    second_partner_id: second.id,
    terms: { kind: 'marriage', start: { date: null, place: '' }, end: null },
  });
}

function birthYearOf(person: PersonSummary): number {
  return person.birth_date?.value.year ?? 1900;
}
