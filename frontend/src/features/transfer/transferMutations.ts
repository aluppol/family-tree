import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { importGedcom, previewGedcomImport } from '../../api/gedcom';
import type { ImportReport, ImportResult } from '../../api/types';

export function usePreviewImport(): UseMutationResult<ImportReport, Error, File> {
  return useMutation({ mutationFn: previewGedcomImport });
}

export function useImportGedcom(): UseMutationResult<ImportResult, Error, File> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importGedcom,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
