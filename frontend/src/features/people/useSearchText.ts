import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const SEARCH_PARAMETER = 'search';
const SEARCH_DELAY_IN_MILLISECONDS = 300;

export interface SearchText {
  text: string;
  onTextChange: (text: string) => void;
  search: string;
}

export function useSearchText(): SearchText {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInUrl = searchParams.get(SEARCH_PARAMETER) ?? '';
  const [text, setText] = useState(searchInUrl);
  const search = useDebouncedValue(text.trim(), SEARCH_DELAY_IN_MILLISECONDS);
  useEffect(() => {
    if (search !== searchInUrl) {
      setSearchParams(search === '' ? {} : { [SEARCH_PARAMETER]: search }, { replace: true });
    }
  }, [search, searchInUrl, setSearchParams]);
  return { text, onTextChange: setText, search };
}
