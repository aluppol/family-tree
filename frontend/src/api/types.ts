export type DateQualifier =
  | 'exact'
  | 'about'
  | 'calculated'
  | 'estimated'
  | 'before'
  | 'after'
  | 'between';

export interface CalendarDate {
  year: number;
  month: number | null;
  day: number | null;
}

export interface GenealogicalDate {
  qualifier: DateQualifier;
  value: CalendarDate;
  until: CalendarDate | null;
}

export type Sex = 'female' | 'male' | 'other' | 'unknown';

export interface LifeEvent {
  date: GenealogicalDate | null;
  place: string;
}

export interface PersonProfile {
  given_names: string;
  surname: string;
  sex: Sex;
  birth: LifeEvent;
  death: LifeEvent | null;
  biography: string;
}

export interface PersonSummary {
  id: number;
  given_names: string;
  surname: string;
  sex: Sex;
  birth_date: GenealogicalDate | null;
  death_date: GenealogicalDate | null;
  is_deceased: boolean;
  has_photo: boolean;
}

export type ParentLinkKind = 'birth' | 'adopted' | 'foster' | 'other';

export interface ParentRelation {
  link_id: number;
  kind: ParentLinkKind;
  person: PersonSummary;
}

export type PartnershipKind = 'marriage' | 'partnership';

export type PartnershipEndReason = 'divorce' | 'annulment' | 'separation';

export interface PartnershipEnd {
  reason: PartnershipEndReason;
  date: GenealogicalDate | null;
}

export interface PartnershipTerms {
  kind: PartnershipKind;
  start: LifeEvent;
  end: PartnershipEnd | null;
}

export interface PartnerRelation {
  partnership_id: number;
  terms: PartnershipTerms;
  partner: PersonSummary;
}

export interface Person extends PersonProfile {
  id: number;
  has_photo: boolean;
  parents: ParentRelation[];
  children: ParentRelation[];
  partnerships: PartnerRelation[];
}

export interface PeoplePage {
  count: number;
  next_offset: number | null;
  results: PersonSummary[];
}

export interface ParentLinkInput {
  parent_id: number;
  child_id: number;
  kind: ParentLinkKind;
}

export interface ParentLink {
  id: number;
  parent_id: number;
  child_id: number;
  kind: ParentLinkKind;
}

export interface PartnershipInput {
  first_partner_id: number;
  second_partner_id: number;
  terms: PartnershipTerms;
}

export interface Partnership {
  id: number;
  first_partner_id: number;
  second_partner_id: number;
  terms: PartnershipTerms;
}

export interface FamilyChart {
  focus_id: number;
  people: PersonSummary[];
  parent_links: ParentLink[];
  partnerships: Partnership[];
}

export interface Workspace {
  home_person_id: number | null;
  people_count: number;
  is_sandbox: boolean;
}

export interface Viewer {
  username: string;
  display_name: string;
  is_guest: boolean;
}

export interface SkippedRecord {
  location: string;
  reason: string;
}

export interface ImportReport {
  people_count: number;
  parent_link_count: number;
  partnership_count: number;
  photo_count: number;
  skipped: SkippedRecord[];
}

export interface ImportResult extends ImportReport {
  home_person_id: number | null;
}

export type ExportFormat = 'gedcom-5.5.1' | 'gedcom-7.0' | 'gedzip';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields: Record<string, string[]>;
  };
}
