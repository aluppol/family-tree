import { buildUrl, sendForm } from './client';
import type { ExportFormat, ImportReport, ImportResult } from './types';

export function previewGedcomImport(file: File): Promise<ImportReport> {
  return sendForm<ImportReport>('/api/gedcom/preview/', gedcomForm(file));
}

export function importGedcom(file: File): Promise<ImportResult> {
  return sendForm<ImportResult>('/api/gedcom/import/', gedcomForm(file));
}

export function gedcomExportUrl(format: ExportFormat): string {
  return buildUrl('/api/gedcom/export/', { format });
}

function gedcomForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}
