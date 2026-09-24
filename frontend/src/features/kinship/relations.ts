import { fetchChildCandidates, fetchParentCandidates, fetchPartnerCandidates } from '../../api/kinship';
import type { ParentLinkInput, ParentLinkKind, ParentRelation, Person } from '../../api/types';
import type { SelectOption } from '../../design/components';
import type { CandidateSource } from './kinshipQueries';

export interface ParentLinkRequest {
  personId: number;
  relativeId: number;
  kind: ParentLinkKind;
}

export interface ParentLinkRelation extends CandidateSource {
  title: string;
  relativeNoun: string;
  emptyText: string;
  relativesOf: (person: Person) => ParentRelation[];
  linkInput: (request: ParentLinkRequest) => ParentLinkInput;
}

export const PARENTS: ParentLinkRelation = {
  list: 'parents',
  fetchCandidates: fetchParentCandidates,
  title: 'Parents',
  relativeNoun: 'parent',
  emptyText: 'No parents recorded yet.',
  relativesOf: (person) => person.parents,
  linkInput: ({ personId, relativeId, kind }) => ({ parent_id: relativeId, child_id: personId, kind }),
};

export const CHILDREN: ParentLinkRelation = {
  list: 'children',
  fetchCandidates: fetchChildCandidates,
  title: 'Children',
  relativeNoun: 'child',
  emptyText: 'No children recorded yet.',
  relativesOf: (person) => person.children,
  linkInput: ({ personId, relativeId, kind }) => ({ parent_id: personId, child_id: relativeId, kind }),
};

export const PARTNERS: CandidateSource = {
  list: 'partners',
  fetchCandidates: fetchPartnerCandidates,
};

export const PARENT_LINK_KIND_OPTIONS: readonly SelectOption<ParentLinkKind>[] = [
  { value: 'birth', label: 'Birth' },
  { value: 'adopted', label: 'Adopted' },
  { value: 'foster', label: 'Foster' },
  { value: 'other', label: 'Other' },
];

export function parentLinkKindLabel(kind: ParentLinkKind): string {
  return PARENT_LINK_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
}
