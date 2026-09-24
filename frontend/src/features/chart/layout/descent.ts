import type { PersonSummary } from '../../../api/types';
import { childLinksOf, type FamilyIndex, otherPartnerIn, type Parentage, parentLinksOf, unionsOf } from './familyIndex';
import { birthOrderKey, dateSortValue, distinctBy, kindRank, sortedBy } from './ordering';
import { firstStep, partnerKey, stepToChild, type TraversalStep } from './traversal';

export interface DescentTree {
  readonly key: string;
  readonly person: PersonSummary;
  readonly partners: readonly PartnerSlot[];
  readonly childGroups: readonly ChildGroup[];
}

export interface PartnerSlot {
  readonly key: string;
  readonly person: PersonSummary;
}

export interface ChildGroup {
  readonly partnerPosition: number | null;
  readonly children: readonly DescendantBranch[];
}

export interface DescendantBranch {
  readonly tree: DescentTree;
  readonly isDashed: boolean;
}

interface Offspring {
  readonly link: Parentage;
  readonly coParentLink: Parentage | undefined;
}

export function buildDescent(index: FamilyIndex, focus: PersonSummary): DescentTree {
  return descentTree(firstStep(index, focus));
}

function descentTree(step: TraversalStep): DescentTree {
  const recordedPartners = partnersInOrder(step);
  const offspring = offspringOf(step, recordedPartners);
  const partners = distinctBy([...recordedPartners, ...coParentsOf(offspring)], (partner) => partner.id);
  return {
    key: step.key,
    person: step.person,
    partners: partners.map((partner) => ({ key: partnerKey(step, partner), person: partner })),
    childGroups: childGroupsOf({ step, partners, offspring }),
  };
}

function partnersInOrder({ index, person }: TraversalStep): PersonSummary[] {
  const unions = sortedBy(unionsOf(index, person), (union) => [dateSortValue(union.start), union.id]);
  return distinctBy(
    unions.map((union) => otherPartnerIn(union, person)),
    (partner) => partner.id,
  );
}

function offspringOf(step: TraversalStep, partners: readonly PersonSummary[]): Offspring[] {
  const links = sortedBy(childLinksOf(step.index, step.person), (link) => [...birthOrderKey(link.child), kindRank(link.kind)]);
  return distinctBy(links, (link) => link.child.id)
    .filter((link) => !step.lineage.has(link.child.id))
    .map((link) => ({ link, coParentLink: coParentLinkOf({ index: step.index, link, partners }) }));
}

function coParentLinkOf({ index, link, partners }: { index: FamilyIndex; link: Parentage; partners: readonly PersonSummary[] }): Parentage | undefined {
  const otherLinks = sortedBy(
    parentLinksOf(index, link.child).filter((other) => other.parent.id !== link.parent.id),
    (other) => [kindRank(other.kind), other.parent.id],
  );
  const partnerLink = partners
    .map((partner) => otherLinks.find((other) => other.parent.id === partner.id))
    .find((found) => found !== undefined);
  return partnerLink ?? otherLinks[0];
}

function coParentsOf(offspring: readonly Offspring[]): PersonSummary[] {
  return offspring.flatMap(({ coParentLink }) => (coParentLink === undefined ? [] : [coParentLink.parent]));
}

function childGroupsOf({ step, partners, offspring }: { step: TraversalStep; partners: readonly PersonSummary[]; offspring: readonly Offspring[] }): ChildGroup[] {
  const partnerGroups = partners.map((partner, position) => ({
    partnerPosition: position,
    children: offspring.filter(({ coParentLink }) => coParentLink?.parent.id === partner.id).map((entry) => branchOf(step, entry)),
  }));
  const singleParentGroup = {
    partnerPosition: null,
    children: offspring.filter(({ coParentLink }) => coParentLink === undefined).map((entry) => branchOf(step, entry)),
  };
  return [...partnerGroups, singleParentGroup].filter((group) => group.children.length > 0);
}

function branchOf(step: TraversalStep, { link, coParentLink }: Offspring): DescendantBranch {
  return {
    tree: descentTree(stepToChild(step, link.child)),
    isDashed: isNonBirth(link) || isNonBirth(coParentLink),
  };
}

function isNonBirth(parentage: Parentage | undefined): boolean {
  return parentage !== undefined && parentage.kind !== 'birth';
}
