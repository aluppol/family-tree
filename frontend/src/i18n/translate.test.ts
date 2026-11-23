import { describe, expect, it, test } from 'vitest';
import { ENGLISH, RUSSIAN, SERBIAN } from '../test/translators';
import type { CatalogueSection } from './catalogue';
import { en } from './en';
import { ru } from './ru';
import { sr } from './sr';
import { isTextKey } from './translate';

const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const PLACEHOLDER = /\{(\w+)\}/gu;
const DATE_PARAMETERS = new Set(['day', 'month', 'monthGenitive', 'year', 'birth', 'death', 'last'].concat(['date', 'from', 'to'].flatMap((name) => [name, `${name}Genitive`, `${name}Instrumental`])));
const ERROR_PARAMETERS = new Set(['message', 'status']);
const PLURAL_COUNTS = [0, 1, 2, 5, 11, 12, 14, 21, 22, 25, 111] as const;

interface Leaf {
  readonly path: string;
  readonly value: string | CatalogueSection;
}

function leavesOf(section: CatalogueSection, prefix = ''): Leaf[] {
  return Object.entries(section).flatMap(([name, value]) => {
    const path = prefix === '' ? name : `${prefix}.${name}`;
    return typeof value === 'string' || isPlural(value) ? [{ path, value }] : leavesOf(value, path);
  });
}

function isPlural(section: CatalogueSection): boolean {
  return 'one' in section && 'other' in section;
}

function placeholdersOf(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? '').sort();
}

function textsOf(value: string | CatalogueSection): string[] {
  return typeof value === 'string' ? [value] : Object.values(value).filter((form) => typeof form === 'string');
}

const CATALOGUES = { en, ru, sr } as const satisfies Record<string, CatalogueSection>;

describe('the three catalogues', () => {
  it('have exactly the same keys', () => {
    const englishPaths = leavesOf(en).map((leaf) => leaf.path);
    expect(leavesOf(ru).map((leaf) => leaf.path)).toEqual(englishPaths);
    expect(leavesOf(sr).map((leaf) => leaf.path)).toEqual(englishPaths);
  });

  it.each([
    ['en', ['one', 'other']],
    ['ru', ['few', 'many', 'one', 'other']],
    ['sr', ['few', 'one', 'other']],
  ] as const)('give %s exactly the plural forms its language needs', (language, forms) => {
    const plurals = leavesOf(CATALOGUES[language]).filter((leaf) => typeof leaf.value !== 'string');
    expect(plurals.length).toBeGreaterThan(0);
    for (const plural of plurals) {
      expect(Object.keys(plural.value).sort(), plural.path).toEqual(forms);
    }
  });

});

describe('every catalogue', () => {
  it('uses plural forms only where a section holds plural categories alone', () => {
    for (const leaf of leavesOf(en).filter((candidate) => typeof candidate.value !== 'string')) {
      expect(Object.keys(leaf.value).every((name) => PLURAL_CATEGORIES.has(name)), leaf.path).toBe(true);
    }
  });

  it('never leaves a text empty', () => {
    for (const catalogue of Object.values(CATALOGUES)) {
      for (const leaf of leavesOf(catalogue)) {
        expect(textsOf(leaf.value).every((text) => text.trim() !== ''), leaf.path).toBe(true);
      }
    }
  });

  it('keeps the placeholders of the English text', () => {
    const englishLeaves = new Map(leavesOf(en).map((leaf) => [leaf.path, leaf.value]));
    for (const leaf of [...leavesOf(ru), ...leavesOf(sr)]) {
      const english = placeholdersOf(textsOf(englishLeaves.get(leaf.path) ?? '').join(' '));
      for (const text of textsOf(leaf.value)) {
        expectPlaceholdersAllowed(leaf.path, placeholdersOf(text), english);
      }
    }
  });
});

function expectPlaceholdersAllowed(path: string, placeholders: readonly string[], english: readonly string[]): void {
  if (path.startsWith('dates.')) {
    expect(placeholders.every((name) => DATE_PARAMETERS.has(name)), path).toBe(true);
  } else if (path.startsWith('errors.')) {
    expect(placeholders.every((name) => ERROR_PARAMETERS.has(name)), path).toBe(true);
  } else {
    expect([...new Set(placeholders)], path).toEqual([...new Set(english)]);
  }
}

describe('plural forms', () => {
  test.each(PLURAL_COUNTS)('Russian and Serbian choose the right form for %i skipped records and marriages', (count) => {
    expect(RUSSIAN('transfer.skipped', { count })).toBe(EXPECTED_RUSSIAN_SKIPPED[count]);
    expect(SERBIAN('transfer.skipped', { count })).toBe(EXPECTED_SERBIAN_SKIPPED[count]);
    expect(RUSSIAN('transfer.marriageCount', { count })).toBe(EXPECTED_RUSSIAN_MARRIAGES[count]);
    expect(SERBIAN('transfer.marriageCount', { count })).toBe(EXPECTED_SERBIAN_MARRIAGES[count]);
  });

  it('English has one and many', () => {
    expect([0, 1, 2].map((count) => ENGLISH('transfer.marriageCount', { count }))).toEqual(['0 marriages', '1 marriage', '2 marriages']);
    expect(ENGLISH('combobox.suggestions', { count: 1 })).toBe('1 suggestion available.');
  });

  it('counts are written the way each language writes numbers', () => {
    expect(ENGLISH('transfer.peopleCount', { count: 1500 })).toBe('1,500 people');
    expect(RUSSIAN('transfer.peopleCount', { count: 1500 })).toBe('1 500 человек');
    expect(SERBIAN('transfer.peopleCount', { count: 1500 })).toBe('1.500 особа');
  });
});

const EXPECTED_RUSSIAN_SKIPPED: Record<(typeof PLURAL_COUNTS)[number], string> = {
  0: '0 записей будут пропущены',
  1: '1 запись будет пропущена',
  2: '2 записи будут пропущены',
  5: '5 записей будут пропущены',
  11: '11 записей будут пропущены',
  12: '12 записей будут пропущены',
  14: '14 записей будут пропущены',
  21: '21 запись будет пропущена',
  22: '22 записи будут пропущены',
  25: '25 записей будут пропущены',
  111: '111 записей будут пропущены',
};

const EXPECTED_SERBIAN_SKIPPED: Record<(typeof PLURAL_COUNTS)[number], string> = {
  0: '0 записа ће бити прескочено',
  1: '1 запис ће бити прескочен',
  2: '2 записа ће бити прескочена',
  5: '5 записа ће бити прескочено',
  11: '11 записа ће бити прескочено',
  12: '12 записа ће бити прескочено',
  14: '14 записа ће бити прескочено',
  21: '21 запис ће бити прескочен',
  22: '22 записа ће бити прескочена',
  25: '25 записа ће бити прескочено',
  111: '111 записа ће бити прескочено',
};

const EXPECTED_RUSSIAN_MARRIAGES: Record<(typeof PLURAL_COUNTS)[number], string> = {
  0: '0 браков',
  1: '1 брак',
  2: '2 брака',
  5: '5 браков',
  11: '11 браков',
  12: '12 браков',
  14: '14 браков',
  21: '21 брак',
  22: '22 брака',
  25: '25 браков',
  111: '111 браков',
};

const EXPECTED_SERBIAN_MARRIAGES: Record<(typeof PLURAL_COUNTS)[number], string> = {
  0: '0 бракова',
  1: '1 брак',
  2: '2 брака',
  5: '5 бракова',
  11: '11 бракова',
  12: '12 бракова',
  14: '14 бракова',
  21: '21 брак',
  22: '22 брака',
  25: '25 бракова',
  111: '111 бракова',
};

describe('the translator', () => {
  it('fills placeholders with the given values', () => {
    expect(ENGLISH('kinship.parents.dialogTitle', { name: 'Emma Wedgwood' })).toBe('Add a parent of Emma Wedgwood');
    expect(RUSSIAN('kinship.parents.dialogTitle', { name: 'Emma Wedgwood' })).toBe('Emma Wedgwood: добавить родителя');
    expect(SERBIAN('people.noMatchTitle', { search: 'Ана' })).toBe('Нико не одговара претрази „Ана“');
  });

  it('leaves a placeholder visible when its value is missing', () => {
    expect(ENGLISH('kinship.parents.dialogTitle')).toBe('Add a parent of {name}');
  });

  it('uses the general form of a plural when no count is given', () => {
    expect(RUSSIAN('transfer.marriageCount' as never)).toBe('{count} брака');
  });

  it('answers with the key itself for a key that is not in the catalogue', () => {
    expect(ENGLISH('no.such.key' as never)).toBe('no.such.key');
  });

  it('knows which keys are texts', () => {
    expect(isTextKey('errors.kinship.cycle')).toBe(true);
    expect(isTextKey('errors.kinship.nope')).toBe(false);
    expect(isTextKey('transfer.skipped')).toBe(false);
    expect(isTextKey('errors')).toBe(false);
  });

  it('names each language in that language', () => {
    expect([ENGLISH, RUSSIAN, SERBIAN].map((t) => t('language.ownName'))).toEqual(['English', 'Русский', 'Српски']);
    expect([ENGLISH, RUSSIAN, SERBIAN].map((t) => t.language)).toEqual(['en', 'ru', 'sr']);
  });
});
