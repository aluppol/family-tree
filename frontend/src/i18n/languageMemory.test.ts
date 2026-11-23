import { afterEach, describe, expect, it, vi } from 'vitest';
import { adoptLanguageFromAddress, LANGUAGE_STORAGE_KEY, rememberedLanguage, rememberLanguage } from './languageMemory';
import { languageNamed } from './languages';

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('the remembered language', () => {
  it('is English on a first visit', () => {
    expect(rememberedLanguage()).toBe('en');
  });

  it('is the language chosen before in this browser', () => {
    rememberLanguage('sr');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('sr');
    expect(rememberedLanguage()).toBe('sr');
  });

  it('falls back to English for anything that is not one of the three languages', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
    expect(rememberedLanguage()).toBe('en');
  });

  it('falls back to English and keeps working when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => {
      rememberLanguage('ru');
    }).not.toThrow();
    expect(rememberedLanguage()).toBe('en');
  });
});

describe('a language in the address', () => {
  it('is remembered and removed from the address, keeping the rest of it', () => {
    window.history.replaceState({ kept: true }, '', '/people?search=Ana&lang=sr#top');
    adoptLanguageFromAddress();
    expect(rememberedLanguage()).toBe('sr');
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/people?search=Ana#top');
    expect(window.history.state).toEqual({ kept: true });
  });

  it('is read whatever its letter case', () => {
    window.history.replaceState(null, '', '/?lang=RU');
    adoptLanguageFromAddress();
    expect(rememberedLanguage()).toBe('ru');
    expect(window.location.search).toBe('');
  });

  it('that is not one of the three languages is removed and changes nothing', () => {
    rememberLanguage('ru');
    window.history.replaceState(null, '', '/tower/7?lang=de');
    adoptLanguageFromAddress();
    expect(rememberedLanguage()).toBe('ru');
    expect(`${window.location.pathname}${window.location.search}`).toBe('/tower/7');
  });

  it('is not needed: without it the address stays as it is', () => {
    window.history.replaceState(null, '', '/people?search=Ana');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    adoptLanguageFromAddress();
    expect(replaceState).not.toHaveBeenCalled();
    expect(rememberedLanguage()).toBe('en');
  });
});

describe('language names', () => {
  it.each([
    ['en', 'en'],
    [' Sr ', 'sr'],
    ['ru', 'ru'],
    ['srp', null],
    [null, null],
  ] as const)('%s is %s', (text, language) => {
    expect(languageNamed(text)).toBe(language);
  });
});
