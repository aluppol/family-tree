import { getJson } from './client';
import type { FamilyChart } from './types';

export interface FamilyChartRequest {
  personId: number;
  ancestors: number;
  descendants: number;
}

export function fetchFamilyChart({ personId, ancestors, descendants }: FamilyChartRequest): Promise<FamilyChart> {
  return getJson<FamilyChart>(`/api/people/${String(personId)}/chart/`, { ancestors, descendants });
}
