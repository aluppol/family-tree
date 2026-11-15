import { getJson } from './client';
import type { FamilyChart } from './types';

export interface FamilyChartRequest {
  personId: number;
}

export function fetchFamilyChart({ personId }: FamilyChartRequest): Promise<FamilyChart> {
  return getJson<FamilyChart>(`/api/people/${String(personId)}/chart/`);
}
