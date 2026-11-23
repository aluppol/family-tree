import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import type { PersonSummary } from '../../api/types';
import { type ComboboxOption, Icon, IconButton, SearchCombobox } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import type { Translate } from '../../i18n/translate';
import { formatLifeYears } from '../dates/format';
import { fullName } from '../people/personName';
import { useEscapeKey } from '../shell/useEscapeKey';
import { searchPeople } from './personSearch';
import styles from './TowerPage.module.scss';

export interface TowerSearchProps {
  people: readonly PersonSummary[];
  label: string;
  onChoose: (personId: number) => void;
  onClose: () => void;
}

const RESULT_LIMIT = 8;

export function TowerSearch({ people, label, onChoose, onClose }: TowerSearchProps): ReactElement {
  const t = useT();
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => searchPeople(t, { people, query, limit: RESULT_LIMIT }).map((person) => optionOf(t, person)), [t, people, query]);
  useEscapeKey({ isActive: true, onEscape: onClose });
  useEffect(() => {
    panelRef.current?.querySelector('input')?.focus();
  }, []);
  return (
    <div ref={panelRef} className={styles.searchPanel}>
      <SearchCombobox
        label={label}
        query={query}
        onQueryChange={setQuery}
        options={options}
        onSelect={(option) => {
          onChoose(Number(option.id));
        }}
        placeholder={t('tower.searchPlaceholder')}
        emptyMessage={query.trim() === '' ? t('tower.startTyping') : t('tower.noOneNamed')}
      />
      <IconButton label={t('tower.closeSearch')} icon={<Icon name="close" />} variant="ghost" onClick={onClose} />
    </div>
  );
}

function optionOf(t: Translate, person: PersonSummary): ComboboxOption {
  const lifeYears = formatLifeYears(t, person);
  return { id: person.id, label: fullName(t, person), description: lifeYears === '' ? undefined : lifeYears };
}
