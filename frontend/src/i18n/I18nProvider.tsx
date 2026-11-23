import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react';
import { type LanguageChoice, LanguageContext } from './languageContext';
import { rememberedLanguage, rememberLanguage } from './languageMemory';
import type { Language } from './languages';
import { translatorFor } from './translate';

export interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps): ReactElement {
  const [language, setLanguage] = useState(rememberedLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const choice = useMemo<LanguageChoice>(() => {
    function chooseLanguage(chosen: Language): void {
      rememberLanguage(chosen);
      setLanguage(chosen);
    }
    return { language, t: translatorFor(language), chooseLanguage };
  }, [language]);
  return <LanguageContext value={choice}>{children}</LanguageContext>;
}
