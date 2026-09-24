import type { GenealogicalDate, ParentLink, Partnership, PersonProfile, Sex, Viewer } from '../api/types';

export interface StoredPerson extends PersonProfile {
  id: number;
  has_photo: boolean;
}

export interface FamilySeed {
  people: StoredPerson[];
  parentLinks: ParentLink[];
  partnerships: Partnership[];
  homePersonId: number | null;
  isSandbox: boolean;
}

export const GUEST_VIEWER: Viewer = { username: 'guest', display_name: 'Demo Visitor', is_guest: true };

export const DARWIN_IDS = { charles: 1, emma: 2, robert: 3, susannah: 4, william: 5 };

export function exactDate(year: number, month: number | null = null, day: number | null = null): GenealogicalDate {
  return { qualifier: 'exact', value: { year, month, day }, until: null };
}

export interface PersonBasics {
  id: number;
  givenNames: string;
  surname: string;
  sex?: Sex;
}

export function storedPerson({ id, givenNames, surname, sex = 'unknown' }: PersonBasics): StoredPerson {
  return {
    id,
    given_names: givenNames,
    surname,
    sex,
    birth: { date: null, place: '' },
    death: null,
    biography: '',
    has_photo: false,
  };
}

export function emptyFamily(): FamilySeed {
  return { people: [], parentLinks: [], partnerships: [], homePersonId: null, isSandbox: false };
}

export function darwinFamily(): FamilySeed {
  return {
    people: [darwinCharles(), darwinEmma(), darwinRobert(), darwinSusannah(), darwinWilliam()],
    parentLinks: [
      { id: 11, parent_id: DARWIN_IDS.robert, child_id: DARWIN_IDS.charles, kind: 'birth' },
      { id: 12, parent_id: DARWIN_IDS.susannah, child_id: DARWIN_IDS.charles, kind: 'birth' },
      { id: 13, parent_id: DARWIN_IDS.charles, child_id: DARWIN_IDS.william, kind: 'birth' },
      { id: 14, parent_id: DARWIN_IDS.emma, child_id: DARWIN_IDS.william, kind: 'birth' },
    ],
    partnerships: [
      {
        id: 21,
        first_partner_id: DARWIN_IDS.charles,
        second_partner_id: DARWIN_IDS.emma,
        terms: { kind: 'marriage', start: { date: exactDate(1839, 1, 29), place: 'Maer' }, end: null },
      },
    ],
    homePersonId: DARWIN_IDS.charles,
    isSandbox: true,
  };
}

function darwinCharles(): StoredPerson {
  return {
    ...storedPerson({ id: DARWIN_IDS.charles, givenNames: 'Charles Robert', surname: 'Darwin', sex: 'male' }),
    birth: { date: exactDate(1809, 2, 12), place: 'Shrewsbury, Shropshire' },
    death: { date: exactDate(1882, 4, 19), place: 'Downe, Kent' },
    biography: 'Naturalist.\nAuthor of On the Origin of Species.',
    has_photo: true,
  };
}

function darwinEmma(): StoredPerson {
  return {
    ...storedPerson({ id: DARWIN_IDS.emma, givenNames: 'Emma', surname: 'Wedgwood', sex: 'female' }),
    birth: { date: exactDate(1808, 5, 2), place: 'Maer Hall, Staffordshire' },
    death: { date: exactDate(1896, 10, 2), place: 'Downe, Kent' },
  };
}

function darwinRobert(): StoredPerson {
  return {
    ...storedPerson({ id: DARWIN_IDS.robert, givenNames: 'Robert Waring', surname: 'Darwin', sex: 'male' }),
    birth: { date: exactDate(1766, 5, 30), place: 'Lichfield' },
    death: { date: exactDate(1848, 11, 13), place: 'Shrewsbury' },
  };
}

function darwinSusannah(): StoredPerson {
  return {
    ...storedPerson({ id: DARWIN_IDS.susannah, givenNames: 'Susannah', surname: 'Wedgwood', sex: 'female' }),
    birth: { date: { qualifier: 'about', value: { year: 1765, month: null, day: null }, until: null }, place: '' },
    death: { date: exactDate(1817, 7, 15), place: 'Shrewsbury' },
  };
}

function darwinWilliam(): StoredPerson {
  return {
    ...storedPerson({ id: DARWIN_IDS.william, givenNames: 'William Erasmus', surname: 'Darwin', sex: 'male' }),
    birth: { date: exactDate(1839, 12, 27), place: 'London' },
  };
}
