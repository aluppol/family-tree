import {
  type NewPersonLinkRequest,
  createNewChild,
  createNewParent,
  fetchChildCandidates,
  fetchParentCandidates,
  fetchPartnerCandidates,
} from '../../api/kinship';
import type { ParentLinkInput, ParentLinkKind, ParentRelation, Person } from '../../api/types';
import type { SelectOption } from '../../design/components';
import type { Translate } from '../../i18n/translate';
import type { CandidateSource } from './kinshipQueries';

export interface ParentLinkRequest {
  personId: number;
  relativeId: number;
  kind: ParentLinkKind;
}

export type ParentLinkSection = 'parents' | 'children';

export interface ParentLinkRelation extends CandidateSource {
  section: ParentLinkSection;
  relativesOf: (person: Person) => ParentRelation[];
  linkInput: (request: ParentLinkRequest) => ParentLinkInput;
  createNewRelative: (request: NewPersonLinkRequest) => Promise<Person>;
  oneWordSurname: (person: Person) => string;
}

export const PARENTS: ParentLinkRelation = {
  list: 'parents',
  fetchCandidates: fetchParentCandidates,
  section: 'parents',
  relativesOf: (person) => person.parents,
  linkInput: ({ personId, relativeId, kind }) => ({ parent_id: relativeId, child_id: personId, kind }),
  createNewRelative: createNewParent,
  oneWordSurname: () => '',
};

export const CHILDREN: ParentLinkRelation = {
  list: 'children',
  fetchCandidates: fetchChildCandidates,
  section: 'children',
  relativesOf: (person) => person.children,
  linkInput: ({ personId, relativeId, kind }) => ({ parent_id: personId, child_id: relativeId, kind }),
  createNewRelative: createNewChild,
  oneWordSurname: (person) => person.surname,
};

export const PARTNERS: CandidateSource = {
  list: 'partners',
  fetchCandidates: fetchPartnerCandidates,
};

const PARENT_LINK_KINDS: readonly ParentLinkKind[] = ['birth', 'adopted', 'foster', 'other'];

export function parentLinkKindOptions(t: Translate): SelectOption<ParentLinkKind>[] {
  return PARENT_LINK_KINDS.map((kind) => ({ value: kind, label: parentLinkKindLabel(t, kind) }));
}

export function parentLinkKindLabel(t: Translate, kind: ParentLinkKind): string {
  return t(`kinship.linkKinds.${kind}`);
}
