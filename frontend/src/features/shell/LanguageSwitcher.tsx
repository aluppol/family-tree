import type { ReactElement } from 'react';
import { useLanguageChoice } from '../../i18n/languageContext';
import { type Language, LANGUAGES } from '../../i18n/languages';
import { translatorFor } from '../../i18n/translate';
import { LanguageFlag } from './LanguageFlag';
import styles from './LanguageSwitcher.module.scss';

export function LanguageSwitcher(): ReactElement {
  const { language, t, chooseLanguage } = useLanguageChoice();
  return (
    <div role="group" aria-label={t('language.choose')} className={styles.switcher}>
      {LANGUAGES.map((option) => (
        <LanguageOption key={option} language={option} isCurrent={option === language} onChoose={chooseLanguage} />
      ))}
    </div>
  );
}

interface LanguageOptionProps {
  language: Language;
  isCurrent: boolean;
  onChoose: (language: Language) => void;
}

function LanguageOption({ language, isCurrent, onChoose }: LanguageOptionProps): ReactElement {
  const ownName = translatorFor(language)('language.ownName');
  return (
    <button
      type="button"
      lang={language}
      className={styles.option}
      aria-label={ownName}
      aria-current={isCurrent ? 'true' : undefined}
      title={ownName}
      onClick={() => {
        onChoose(language);
      }}
    >
      <LanguageFlag language={language} />
    </button>
  );
}
