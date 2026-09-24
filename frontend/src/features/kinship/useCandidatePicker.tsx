import { useState } from 'react';
import type { PersonSummary } from '../../api/types';
import { Avatar, type ComboboxOption } from '../../design/components';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatLifeYears } from '../dates/format';
import { fullName } from '../people/personName';
import { type CandidateSource, useCandidates } from './kinshipQueries';

const SEARCH_DELAY_IN_MILLISECONDS = 250;

export interface PersonOption extends ComboboxOption {
  person: PersonSummary;
}

export interface CandidatePicker {
  query: string;
  onQueryChange: (query: string) => void;
  options: PersonOption[];
  onSelect: (option: PersonOption) => void;
  isLoading: boolean;
  selectedPerson: PersonSummary | null;
}

export function useCandidatePicker(source: CandidateSource, personId: number): CandidatePicker {
  const [query, setQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);
  const search = useDebouncedValue(query.trim(), SEARCH_DELAY_IN_MILLISECONDS);
  const candidates = useCandidates(source, { personId, search });
  function handleQueryChange(nextQuery: string): void {
    setQuery(nextQuery);
    setSelectedPerson(null);
  }
  function handleSelect(option: PersonOption): void {
    setSelectedPerson(option.person);
    setQuery(option.label);
  }
  return {
    query,
    onQueryChange: handleQueryChange,
    options: (candidates.data ?? []).map(personOption),
    onSelect: handleSelect,
    isLoading: candidates.isFetching,
    selectedPerson,
  };
}

function personOption(person: PersonSummary): PersonOption {
  const lifeYears = formatLifeYears(person);
  return {
    id: person.id,
    label: fullName(person),
    description: lifeYears === '' ? undefined : lifeYears,
    leading: <Avatar person={person} size="small" />,
    person,
  };
}
