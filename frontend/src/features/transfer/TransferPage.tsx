import type { UseMutationResult } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import type { ImportReport, ImportResult } from '../../api/types';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import type { ImportStep } from './ImportStepView';
import { useImportGedcom, usePreviewImport } from './transferMutations';
import { TransferView } from './TransferView';

export function TransferPage(): ReactElement {
  useDocumentTitle('Import & export');
  const [file, setFile] = useState<File | null>(null);
  const preview = usePreviewImport();
  const importFile = useImportGedcom();
  function handleFileSelect(chosenFile: File): void {
    setFile(chosenFile);
    importFile.reset();
    preview.mutate(chosenFile);
  }
  function handleImport(): void {
    if (file !== null && !importFile.isPending) {
      importFile.mutate(file);
    }
  }
  function handleStartOver(): void {
    setFile(null);
    preview.reset();
    importFile.reset();
  }
  const step = importStepOf({ file, preview, importFile });
  return <TransferView step={step} onFileSelect={handleFileSelect} onImport={handleImport} onStartOver={handleStartOver} />;
}

interface ImportProgress {
  file: File | null;
  preview: UseMutationResult<ImportReport, Error, File>;
  importFile: UseMutationResult<ImportResult, Error, File>;
}

function importStepOf({ file, preview, importFile }: ImportProgress): ImportStep {
  if (file === null) {
    return { step: 'choose' };
  }
  if (importFile.isSuccess) {
    return { step: 'done', fileName: file.name, result: importFile.data };
  }
  if (preview.isSuccess) {
    return { step: 'review', fileName: file.name, report: preview.data, isImporting: importFile.isPending, importError: importFile.error };
  }
  if (preview.isError) {
    return { step: 'unreadable', fileName: file.name, error: preview.error };
  }
  return { step: 'reading', fileName: file.name };
}
