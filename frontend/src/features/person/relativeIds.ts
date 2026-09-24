import type { Person } from '../../api/types';

export function relativeIds(person: Person): number[] {
  return [
    ...person.parents.map((parent) => parent.person.id),
    ...person.children.map((child) => child.person.id),
    ...person.partnerships.map((partnership) => partnership.partner.id),
  ];
}
