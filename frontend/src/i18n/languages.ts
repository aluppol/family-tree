export const LANGUAGES = ['en', 'ru', 'sr'] as const;

export type Language = (typeof LANGUAGES)[number];

export type MonthStyle = 'short' | 'long';

interface LanguageProfile {
  readonly locale: string;
  readonly monthStyle: MonthStyle;
}

export const DEFAULT_LANGUAGE: Language = 'en';

const PROFILES: Readonly<Record<Language, LanguageProfile>> = {
  en: { locale: 'en', monthStyle: 'short' },
  ru: { locale: 'ru', monthStyle: 'long' },
  sr: { locale: 'sr-Cyrl', monthStyle: 'long' },
};

export function localeOf(language: Language): string {
  return PROFILES[language].locale;
}

export function monthStyleOf(language: Language): MonthStyle {
  return PROFILES[language].monthStyle;
}

export function languageNamed(text: string | null): Language | null {
  const normalized = text?.trim().toLowerCase();
  return LANGUAGES.find((language) => language === normalized) ?? null;
}
