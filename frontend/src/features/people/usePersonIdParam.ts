import { useParams } from 'react-router';

export function usePersonIdParam(): number | null {
  const { personId } = useParams();
  const parsedId = Number(personId);
  return Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
}
