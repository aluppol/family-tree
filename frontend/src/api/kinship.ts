import { deleteResource, getJson, sendJson } from './client';
import type { ParentLink, ParentLinkInput, ParentLinkKind, Partnership, PartnershipInput, PartnershipTerms, PersonSummary } from './types';

export interface CandidateSearch {
  personId: number;
  search: string;
}

export interface ParentLinkKindChange {
  linkId: number;
  kind: ParentLinkKind;
}

export interface PartnershipTermsChange {
  partnershipId: number;
  terms: PartnershipTerms;
}

export function fetchParentCandidates({ personId, search }: CandidateSearch): Promise<PersonSummary[]> {
  return getJson<PersonSummary[]>(candidatesPath(personId, 'parent-candidates'), { search });
}

export function fetchChildCandidates({ personId, search }: CandidateSearch): Promise<PersonSummary[]> {
  return getJson<PersonSummary[]>(candidatesPath(personId, 'child-candidates'), { search });
}

export function fetchPartnerCandidates({ personId, search }: CandidateSearch): Promise<PersonSummary[]> {
  return getJson<PersonSummary[]>(candidatesPath(personId, 'partner-candidates'), { search });
}

export function createParentLink(input: ParentLinkInput): Promise<ParentLink> {
  return sendJson<ParentLink>('POST', '/api/parent-links/', input);
}

export function changeParentLinkKind({ linkId, kind }: ParentLinkKindChange): Promise<ParentLink> {
  return sendJson<ParentLink>('PUT', parentLinkPath(linkId), { kind });
}

export function removeParentLink(linkId: number): Promise<void> {
  return deleteResource(parentLinkPath(linkId));
}

export function createPartnership(input: PartnershipInput): Promise<Partnership> {
  return sendJson<Partnership>('POST', '/api/partnerships/', input);
}

export function changePartnershipTerms({ partnershipId, terms }: PartnershipTermsChange): Promise<Partnership> {
  return sendJson<Partnership>('PUT', partnershipPath(partnershipId), { terms });
}

export function removePartnership(partnershipId: number): Promise<void> {
  return deleteResource(partnershipPath(partnershipId));
}

function candidatesPath(personId: number, candidateList: string): string {
  return `/api/people/${String(personId)}/${candidateList}/`;
}

function parentLinkPath(linkId: number): string {
  return `/api/parent-links/${String(linkId)}/`;
}

function partnershipPath(partnershipId: number): string {
  return `/api/partnerships/${String(partnershipId)}/`;
}
