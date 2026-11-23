import type { CatalogueSection, CountParams, MessageParams, PluralKey, TextKey } from './catalogue';
import { en } from './en';
import { type Language, localeOf } from './languages';
import { ru } from './ru';
import { sr } from './sr';

export interface Translate {
  (key: TextKey, params?: MessageParams): string;
  (key: PluralKey, params: CountParams): string;
  readonly language: Language;
}

type CatalogueEntry = string | CatalogueSection;

interface Formatters {
  readonly plurals: Intl.PluralRules;
  readonly numbers: Intl.NumberFormat;
}

const CATALOGUES: Readonly<Record<Language, CatalogueSection>> = { en, ru, sr };

const PLACEHOLDER = /\{(\w+)\}/gu;

const TRANSLATORS: Readonly<Record<Language, Translate>> = {
  en: createTranslate('en'),
  ru: createTranslate('ru'),
  sr: createTranslate('sr'),
};

export function translatorFor(language: Language): Translate {
  return TRANSLATORS[language];
}

export function isTextKey(key: string): key is TextKey {
  return typeof entryAt(en, key) === 'string';
}

function createTranslate(language: Language): Translate {
  const catalogue = CATALOGUES[language];
  const formatters: Formatters = { plurals: new Intl.PluralRules(localeOf(language)), numbers: new Intl.NumberFormat(localeOf(language)) };
  function translate(key: string, params: MessageParams = {}): string {
    const template = templateOf(entryAt(catalogue, key), params.count, formatters);
    return template === undefined ? key : interpolate(template, params, formatters);
  }
  return Object.assign(translate, { language });
}

function entryAt(catalogue: CatalogueSection, key: string): CatalogueEntry | undefined {
  return key.split('.').reduce<CatalogueEntry | undefined>((entry, name) => (typeof entry === 'object' ? entry[name] : undefined), catalogue);
}

function templateOf(entry: CatalogueEntry | undefined, count: string | number | undefined, formatters: Formatters): string | undefined {
  if (typeof entry !== 'object') {
    return entry;
  }
  const form = typeof count === 'number' ? entry[formatters.plurals.select(count)] : undefined;
  const chosen = form ?? entry.other;
  return typeof chosen === 'string' ? chosen : undefined;
}

function interpolate(template: string, params: MessageParams, formatters: Formatters): string {
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = params[name];
    if (value === undefined) {
      return placeholder;
    }
    return typeof value === 'number' ? formatters.numbers.format(value) : value;
  });
}
