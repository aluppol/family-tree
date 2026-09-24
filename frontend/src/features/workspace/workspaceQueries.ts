import { type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VIEWER_KEY, WORKSPACE_KEY } from '../../api/queryCache';
import type { Viewer, Workspace } from '../../api/types';
import { fetchViewer, fetchWorkspace, setHomePerson } from '../../api/workspace';

export function useViewer(): UseQueryResult<Viewer> {
  return useQuery({ queryKey: VIEWER_KEY, queryFn: fetchViewer, staleTime: Infinity });
}

export function useWorkspace(): UseQueryResult<Workspace> {
  return useQuery({ queryKey: WORKSPACE_KEY, queryFn: fetchWorkspace });
}

export function useSetHomePerson(): UseMutationResult<Workspace, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setHomePerson,
    onSuccess: (workspace) => {
      queryClient.setQueryData(WORKSPACE_KEY, workspace);
    },
  });
}
