import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { treeGraphKey } from '../../api/queryCache';
import type { TreeGraph } from '../../api/types';
import { fetchTreeGraph } from '../../api/workspace';

export function useTreeGraph(): UseQueryResult<TreeGraph> {
  return useQuery({ queryKey: treeGraphKey(), queryFn: fetchTreeGraph });
}
