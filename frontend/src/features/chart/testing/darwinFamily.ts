import type { FamilyChart, ParentLink, Partnership, PersonSummary, Sex } from '../../../api/types';
import { personSummary, yearDate } from './familyScript';

type DarwinPerson = readonly [id: number, givenNames: string, surname: string, sex: Sex, born: number, died: number | null];

const PEOPLE: readonly DarwinPerson[] = [
  [1, 'Charles Robert', 'Darwin', 'male', 1809, 1882],
  [2, 'Emma', 'Wedgwood', 'female', 1808, 1896],
  [3, 'Robert Waring', 'Darwin', 'male', 1766, 1848],
  [4, 'Susannah', 'Wedgwood', 'female', 1765, 1817],
  [5, 'Erasmus', 'Darwin', 'male', 1731, 1802],
  [6, 'Mary', 'Howard', 'female', 1740, 1770],
  [7, 'Josiah', 'Wedgwood', 'male', 1730, 1795],
  [8, 'Sarah', 'Wedgwood', 'female', 1734, 1815],
  [9, 'Josiah', 'Wedgwood', 'male', 1769, 1843],
  [10, 'Elizabeth', 'Allen', 'female', 1764, 1846],
  [11, 'William Erasmus', 'Darwin', 'male', 1839, 1914],
  [12, 'Anne Elizabeth', 'Darwin', 'female', 1841, 1851],
  [13, 'Henrietta Emma', 'Darwin', 'female', 1843, 1927],
  [14, 'George Howard', 'Darwin', 'male', 1845, 1912],
  [15, 'Francis', 'Darwin', 'male', 1848, 1925],
  [16, 'Leonard', 'Darwin', 'male', 1850, 1943],
  [17, 'Horace', 'Darwin', 'male', 1851, 1928],
  [18, 'Maud', 'du Puy', 'female', 1861, 1947],
  [19, 'Amy', 'Ruck', 'female', 1850, 1876],
  [20, 'Ellen Wordsworth', 'Crofts', 'female', 1856, 1903],
  [21, 'Florence Henrietta', 'Fisher', 'female', 1864, 1920],
  [22, 'Gwendolen Mary', 'Darwin', 'female', 1885, 1957],
  [23, 'Charles Galton', 'Darwin', 'male', 1887, 1962],
  [24, 'Bernard Richard Meirion', 'Darwin', 'male', 1876, 1961],
  [25, 'Frances Crofts', 'Darwin', 'female', 1886, 1960],
  [26, 'Ida', 'Farrer', 'female', 1854, 1946],
  [27, 'Ruth', 'Darwin', 'female', 1883, 1973],
];

type ParentPair = readonly [parent: number, child: number];

const PARENTS: readonly ParentPair[] = [
  [3, 1],
  [4, 1],
  [5, 3],
  [6, 3],
  [7, 4],
  [8, 4],
  [9, 2],
  [10, 2],
  [7, 9],
  [8, 9],
  ...[11, 12, 13, 14, 15, 16, 17].flatMap((child): ParentPair[] => [
    [1, child],
    [2, child],
  ]),
  [14, 22],
  [18, 22],
  [14, 23],
  [18, 23],
  [15, 24],
  [19, 24],
  [15, 25],
  [20, 25],
  [17, 27],
  [26, 27],
];

const PARTNERS: readonly (readonly [first: number, second: number, year: number])[] = [
  [1, 2, 1839],
  [3, 4, 1796],
  [5, 6, 1757],
  [7, 8, 1764],
  [9, 10, 1792],
  [14, 18, 1884],
  [15, 19, 1874],
  [15, 20, 1883],
  [15, 21, 1913],
  [17, 26, 1880],
];

export const CHARLES_DARWIN_ID = 1;
export const GEORGE_DARWIN_ID = 14;

export function darwinFamilyChart(focusId: number = CHARLES_DARWIN_ID): FamilyChart {
  return {
    focus_id: focusId,
    people: PEOPLE.map(darwinSummary),
    parent_links: PARENTS.map(([parent, child], position): ParentLink => ({ id: position + 1, parent_id: parent, child_id: child, kind: 'birth' })),
    partnerships: PARTNERS.map(darwinPartnership),
  };
}

function darwinSummary([id, givenNames, surname, sex, born, died]: DarwinPerson): PersonSummary {
  return personSummary({
    id,
    given_names: givenNames,
    surname,
    sex,
    birth_date: yearDate(born),
    death_date: yearDate(died),
    is_deceased: died !== null,
    has_photo: id === CHARLES_DARWIN_ID,
  });
}

function darwinPartnership([first, second, year]: readonly [number, number, number], position: number): Partnership {
  return {
    id: position + 1,
    first_partner_id: first,
    second_partner_id: second,
    terms: { kind: 'marriage', start: { date: yearDate(year), place: '' }, end: null },
  };
}
