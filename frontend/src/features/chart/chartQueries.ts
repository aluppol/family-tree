import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { type FamilyChartRequest, fetchFamilyChart } from '../../api/chart';
import { CHARTS_KEY } from '../../api/queryCache';
import type { FamilyChart } from '../../api/types';

export function useFamilyChart(request: FamilyChartRequest): UseQueryResult<FamilyChart> {
  return useQuery({
    queryKey: [...CHARTS_KEY, request.personId],
    queryFn: () => fetchFamilyChart(request),
  });
}
