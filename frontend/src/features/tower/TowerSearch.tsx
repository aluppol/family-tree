import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import type { PersonSummary } from '../../api/types';
import { type ComboboxOption, Icon, IconButton, SearchCombobox } from '../../design/components';
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
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => searchPeople(people, query, RESULT_LIMIT).map(optionOf), [people, query]);
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
        placeholder="Type a name"
        emptyMessage={query.trim() === '' ? 'Start typing a name' : 'No one with that name'}
      />
      <IconButton label="Close search" icon={<Icon name="close" />} variant="ghost" onClick={onClose} />
    </div>
  );
}

function optionOf(person: PersonSummary): ComboboxOption {
  const lifeYears = formatLifeYears(person);
  return { id: person.id, label: fullName(person), description: lifeYears === '' ? undefined : lifeYears };
}
