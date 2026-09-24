import type { PeoplePageRequest } from '../api/people';
import type {
  FamilyChart,
  ParentLink,
  ParentLinkInput,
  ParentLinkKind,
  ParentRelation,
  PartnerRelation,
  Partnership,
  PartnershipInput,
  PartnershipTerms,
  PeoplePage,
  Person,
  PersonProfile,
  PersonSummary,
  Workspace,
} from '../api/types';
import type { FamilySeed, StoredPerson } from './fixtures';

export type CandidateRelation = 'parent' | 'child' | 'partner';

export class FakeFamilyBackend {
  private people = new Map<number, StoredPerson>();
  private parentLinks = new Map<number, ParentLink>();
  private partnerships = new Map<number, Partnership>();
  private homePersonId: number | null = null;
  private isSandbox = false;
  private lastId = 1000;

  seed(seed: FamilySeed): void {
    this.people = new Map(seed.people.map((person) => [person.id, structuredClone(person)]));
    this.parentLinks = new Map(seed.parentLinks.map((link) => [link.id, { ...link }]));
    this.partnerships = new Map(seed.partnerships.map((partnership) => [partnership.id, structuredClone(partnership)]));
    this.homePersonId = seed.homePersonId;
    this.isSandbox = seed.isSandbox;
  }

  workspace(): Workspace {
    return { home_person_id: this.homePersonId, people_count: this.people.size, is_sandbox: this.isSandbox };
  }

  setHomePerson(personId: number | null): Workspace {
    this.homePersonId = personId;
    return this.workspace();
  }

  listPeople({ search, offset, limit }: PeoplePageRequest): PeoplePage {
    const matches = [...this.people.values()].filter((person) => matchesSearch(person, search)).sort(bySurnameThenGivenNames);
    const nextOffset = offset + limit < matches.length ? offset + limit : null;
    return { count: matches.length, next_offset: nextOffset, results: matches.slice(offset, offset + limit).map(summaryOf) };
  }

  chart(personId: number): FamilyChart | undefined {
    if (!this.people.has(personId)) {
      return undefined;
    }
    return {
      focus_id: personId,
      people: [...this.people.values()].map(summaryOf),
      parent_links: [...this.parentLinks.values()],
      partnerships: [...this.partnerships.values()],
    };
  }

  person(personId: number): Person | undefined {
    const stored = this.people.get(personId);
    return stored === undefined ? undefined : this.detailOf(stored);
  }

  createPerson(profile: PersonProfile): Person {
    const id = this.nextId();
    const stored: StoredPerson = { ...profile, id, has_photo: false };
    this.people.set(id, stored);
    return this.detailOf(stored);
  }

  updatePerson(personId: number, profile: PersonProfile): Person | undefined {
    const stored = this.people.get(personId);
    if (stored === undefined) {
      return undefined;
    }
    const updated: StoredPerson = { ...stored, ...profile };
    this.people.set(personId, updated);
    return this.detailOf(updated);
  }

  deletePerson(personId: number): boolean {
    const existed = this.people.delete(personId);
    this.parentLinks = new Map([...this.parentLinks].filter(([, link]) => link.parent_id !== personId && link.child_id !== personId));
    this.partnerships = new Map([...this.partnerships].filter(([, partnership]) => !involves(partnership, personId)));
    this.homePersonId = this.homePersonId === personId ? null : this.homePersonId;
    return existed;
  }

  setPhotoPresence(personId: number, hasPhoto: boolean): boolean {
    const stored = this.people.get(personId);
    if (stored !== undefined) {
      this.people.set(personId, { ...stored, has_photo: hasPhoto });
    }
    return stored !== undefined;
  }

  candidates(personId: number, relation: CandidateRelation, search: string): PersonSummary[] {
    const excludedIds = new Set([personId, ...this.relatedIds(personId, relation)]);
    return [...this.people.values()]
      .filter((person) => !excludedIds.has(person.id) && matchesSearch(person, search))
      .sort(bySurnameThenGivenNames)
      .slice(0, 20)
      .map(summaryOf);
  }

  createParentLink(input: ParentLinkInput): ParentLink {
    const link: ParentLink = { id: this.nextId(), ...input };
    this.parentLinks.set(link.id, link);
    return link;
  }

  changeParentLinkKind(linkId: number, kind: ParentLinkKind): ParentLink | undefined {
    const link = this.parentLinks.get(linkId);
    if (link === undefined) {
      return undefined;
    }
    const changed = { ...link, kind };
    this.parentLinks.set(linkId, changed);
    return changed;
  }

  removeParentLink(linkId: number): boolean {
    return this.parentLinks.delete(linkId);
  }

  createPartnership(input: PartnershipInput): Partnership {
    const partnership: Partnership = { id: this.nextId(), ...input };
    this.partnerships.set(partnership.id, partnership);
    return partnership;
  }

  changePartnershipTerms(partnershipId: number, terms: PartnershipTerms): Partnership | undefined {
    const partnership = this.partnerships.get(partnershipId);
    if (partnership === undefined) {
      return undefined;
    }
    const changed = { ...partnership, terms };
    this.partnerships.set(partnershipId, changed);
    return changed;
  }

  removePartnership(partnershipId: number): boolean {
    return this.partnerships.delete(partnershipId);
  }

  private nextId(): number {
    this.lastId += 1;
    return this.lastId;
  }

  private relatedIds(personId: number, relation: CandidateRelation): number[] {
    const links = [...this.parentLinks.values()];
    if (relation === 'parent') {
      return links.filter((link) => link.child_id === personId).map((link) => link.parent_id);
    }
    return relation === 'child' ? links.filter((link) => link.parent_id === personId).map((link) => link.child_id) : [];
  }

  private detailOf(stored: StoredPerson): Person {
    const links = [...this.parentLinks.values()];
    return {
      ...stored,
      parents: links.filter((link) => link.child_id === stored.id).map((link) => this.parentRelation(link, link.parent_id)),
      children: links.filter((link) => link.parent_id === stored.id).map((link) => this.parentRelation(link, link.child_id)),
      partnerships: [...this.partnerships.values()].filter((partnership) => involves(partnership, stored.id)).map((partnership) => this.partnerRelation(partnership, stored.id)),
    };
  }

  private parentRelation(link: ParentLink, relativeId: number): ParentRelation {
    return { link_id: link.id, kind: link.kind, person: this.summary(relativeId) };
  }

  private partnerRelation(partnership: Partnership, personId: number): PartnerRelation {
    const partnerId = partnership.first_partner_id === personId ? partnership.second_partner_id : partnership.first_partner_id;
    return { partnership_id: partnership.id, terms: partnership.terms, partner: this.summary(partnerId) };
  }

  private summary(personId: number): PersonSummary {
    const stored = this.people.get(personId);
    if (stored === undefined) {
      throw new Error(`Fake backend has no person ${String(personId)}.`);
    }
    return summaryOf(stored);
  }
}

function summaryOf(stored: StoredPerson): PersonSummary {
  return {
    id: stored.id,
    given_names: stored.given_names,
    surname: stored.surname,
    sex: stored.sex,
    birth_date: stored.birth.date,
    death_date: stored.death?.date ?? null,
    is_deceased: stored.death !== null,
    has_photo: stored.has_photo,
  };
}

function matchesSearch(person: StoredPerson, search: string): boolean {
  const needle = search.trim().toLowerCase();
  return person.given_names.toLowerCase().includes(needle) || person.surname.toLowerCase().includes(needle);
}

function bySurnameThenGivenNames(first: StoredPerson, second: StoredPerson): number {
  return first.surname.localeCompare(second.surname) || first.given_names.localeCompare(second.given_names) || first.id - second.id;
}

function involves(partnership: Partnership, personId: number): boolean {
  return partnership.first_partner_id === personId || partnership.second_partner_id === personId;
}
