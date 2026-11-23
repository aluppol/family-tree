import { DEFAULT_LANGUAGE, type Language, languageNamed } from './languages';

export const LANGUAGE_STORAGE_KEY = 'family-tree.language';

export const LANGUAGE_PARAMETER = 'lang';

export function rememberedLanguage(): Language {
  return languageNamed(readStoredLanguage()) ?? DEFAULT_LANGUAGE;
}

export function rememberLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    return;
  }
}

export function adoptLanguageFromAddress(): void {
  const address = new URL(window.location.href);
  const requested = address.searchParams.get(LANGUAGE_PARAMETER);
  if (requested === null) {
    return;
  }
  const language = languageNamed(requested);
  if (language !== null) {
    rememberLanguage(language);
  }
  address.searchParams.delete(LANGUAGE_PARAMETER);
  window.history.replaceState(window.history.state, '', `${address.pathname}${address.search}${address.hash}`);
}

function readStoredLanguage(): string | null {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}
