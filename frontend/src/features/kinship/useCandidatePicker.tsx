import { useState } from 'react';
import type { PersonSummary } from '../../api/types';
import { Avatar, type ComboboxOption, Icon } from '../../design/components';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatLifeYears } from '../dates/format';
import { fullName } from '../people/personName';
import styles from './Kinship.module.scss';
import { type CandidateSource, useCandidates } from './kinshipQueries';

const SEARCH_DELAY_IN_MILLISECONDS = 250;

const NEW_PERSON_OPTION_ID = 'new-person';

export interface PersonOption extends ComboboxOption {
  kind: 'person';
  person: PersonSummary;
}

export interface NewPersonOption extends ComboboxOption {
  kind: 'new-person';
  typedName: string;
}

export type CandidateOption = PersonOption | NewPersonOption;

export interface CandidatePicker {
  query: string;
  onQueryChange: (query: string) => void;
  options: CandidateOption[];
  onSelect: (option: CandidateOption) => void;
  isLoading: boolean;
  selectedPerson: PersonSummary | null;
}

export function useCandidatePicker(source: CandidateSource, personId: number, onChooseNewPerson: (typedName: string) => void): CandidatePicker {
  const [query, setQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);
  const search = useDebouncedValue(query.trim(), SEARCH_DELAY_IN_MILLISECONDS);
  const candidates = useCandidates(source, { personId, search });
  function handleQueryChange(nextQuery: string): void {
    setQuery(nextQuery);
    setSelectedPerson(null);
  }
  function handleSelect(option: CandidateOption): void {
    if (option.kind === 'new-person') {
      onChooseNewPerson(option.typedName);
    } else {
      setSelectedPerson(option.person);
      setQuery(option.label);
    }
  }
  return {
    query,
    onQueryChange: handleQueryChange,
    options: [...(candidates.data ?? []).map(personOption), ...newPersonOptions(selectedPerson === null ? query.trim() : '')],
    onSelect: handleSelect,
    isLoading: candidates.isFetching,
    selectedPerson,
  };
}

function personOption(person: PersonSummary): PersonOption {
  const lifeYears = formatLifeYears(person);
  return {
    kind: 'person',
    id: person.id,
    label: fullName(person),
    description: lifeYears === '' ? undefined : lifeYears,
    leading: <Avatar person={person} size="small" />,
    person,
  };
}

function newPersonOptions(typedName: string): NewPersonOption[] {
  if (typedName === '') {
    return [];
  }
  const leading = (
    <span className={styles.newPersonMark}>
      <Icon name="plus" />
    </span>
  );
  return [{ kind: 'new-person', id: NEW_PERSON_OPTION_ID, label: `Add “${typedName}” as a new person`, leading, typedName }];
}
