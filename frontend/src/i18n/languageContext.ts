import { createContext, use } from 'react';
import { DEFAULT_LANGUAGE, type Language } from './languages';
import { type Translate, translatorFor } from './translate';

export interface LanguageChoice {
  readonly language: Language;
  readonly t: Translate;
  readonly chooseLanguage: (language: Language) => void;
}

const DEFAULT_CHOICE: LanguageChoice = {
  language: DEFAULT_LANGUAGE,
  t: translatorFor(DEFAULT_LANGUAGE),
  chooseLanguage: () => undefined,
};

export const LanguageContext = createContext<LanguageChoice>(DEFAULT_CHOICE);

export function useT(): Translate {
  return use(LanguageContext).t;
}

export function useLanguageChoice(): LanguageChoice {
  return use(LanguageContext);
}
