import type { en } from './en';

type PluralCategories<Category extends Intl.LDMLPluralRule> = Readonly<Record<Category | 'other', string>>;

export type EnglishPlural = PluralCategories<'one'>;

export type RussianPlural = PluralCategories<'one' | 'few' | 'many'>;

export type SerbianPlural = PluralCategories<'one' | 'few'>;

export interface CatalogueSection {
  readonly [name: string]: string | CatalogueSection;
}

type Translated<Source, Plural> = {
  readonly [Name in keyof Source]: Source[Name] extends string ? string : Source[Name] extends EnglishPlural ? Plural : Translated<Source[Name], Plural>;
};

export type Catalogue<Plural extends EnglishPlural> = Translated<typeof en, Plural>;

type TextPaths<Section> = {
  [Name in keyof Section & string]: Section[Name] extends string ? Name : Section[Name] extends EnglishPlural ? never : `${Name}.${TextPaths<Section[Name]>}`;
}[keyof Section & string];

type PluralPaths<Section> = {
  [Name in keyof Section & string]: Section[Name] extends string ? never : Section[Name] extends EnglishPlural ? Name : `${Name}.${PluralPaths<Section[Name]>}`;
}[keyof Section & string];

export type TextKey = TextPaths<typeof en>;

export type PluralKey = PluralPaths<typeof en>;

export type MessageParams = Readonly<Record<string, string | number>>;

export type CountParams = MessageParams & { readonly count: number };
