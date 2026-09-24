import type { ReactElement } from 'react';
import type { ImportReport, ImportResult } from '../../api/types';
import { Banner, Button, ButtonLink, FileButton, Icon, InlineError, LoadingState } from '../../design/components';
import { HOME_PATH, treePath } from '../../routePaths';
import { countOf } from './countOf';
import { ImportReportView } from './ImportReportView';
import styles from './Transfer.module.scss';

const ACCEPTED_GEDCOM_FILES = '.ged,.gdz,.zip';

export type ImportStep =
  | { step: 'choose' }
  | { step: 'reading'; fileName: string }
  | { step: 'unreadable'; fileName: string; error: unknown }
  | { step: 'review'; fileName: string; report: ImportReport; isImporting: boolean; importError: unknown }
  | { step: 'done'; fileName: string; result: ImportResult };

export interface ImportStepViewProps {
  step: ImportStep;
  onFileSelect: (file: File) => void;
  onImport: () => void;
  onStartOver: () => void;
}

export function ImportStepView({ step, onFileSelect, onImport, onStartOver }: ImportStepViewProps): ReactElement {
  switch (step.step) {
    case 'choose':
      return <GedcomFileButton label="Choose a file" onFileSelect={onFileSelect} />;
    case 'reading':
      return <LoadingState label={`Reading ${step.fileName}…`} />;
    case 'unreadable':
      return (
        <div className={styles.step}>
          <InlineError error={step.error} />
          <GedcomFileButton label="Choose another file" onFileSelect={onFileSelect} />
        </div>
      );
    case 'review':
      return <ReviewStep step={step} onFileSelect={onFileSelect} onImport={onImport} />;
    case 'done':
      return <DoneStep result={step.result} onStartOver={onStartOver} />;
  }
}

function GedcomFileButton({ label, onFileSelect }: { label: string; onFileSelect: (file: File) => void }): ReactElement {
  return <FileButton label={label} accept={ACCEPTED_GEDCOM_FILES} onFileSelect={onFileSelect} icon={<Icon name="upload" />} variant="primary" />;
}

interface ReviewStepProps {
  step: Extract<ImportStep, { step: 'review' }>;
  onFileSelect: (file: File) => void;
  onImport: () => void;
}

function ReviewStep({ step, onFileSelect, onImport }: ReviewStepProps): ReactElement {
  return (
    <div className={styles.step}>
      <ImportReportView fileName={step.fileName} report={step.report} />
      <InlineError error={step.importError} />
      <div className={styles.stepActions}>
        <Button variant="primary" onClick={onImport} aria-disabled={step.isImporting}>
          {step.isImporting ? 'Importing…' : `Import ${countOf(step.report.people_count, 'person', 'people')}`}
        </Button>
        <FileButton label="Choose another file" accept={ACCEPTED_GEDCOM_FILES} onFileSelect={onFileSelect} disabled={step.isImporting} />
      </div>
    </div>
  );
}

function DoneStep({ result, onStartOver }: { result: ImportResult; onStartOver: () => void }): ReactElement {
  return (
    <div className={styles.step}>
      <Banner tone="success">
        <p role="status">
          Imported {countOf(result.people_count, 'person', 'people')}, {countOf(result.parent_link_count, 'parent link', 'parent links')} and{' '}
          {countOf(result.partnership_count, 'partnership', 'partnerships')}.
        </p>
      </Banner>
      <div className={styles.stepActions}>
        <ButtonLink to={result.home_person_id === null ? HOME_PATH : treePath(result.home_person_id)} variant="primary">
          <Icon name="tree" />
          Show the tree
        </ButtonLink>
        <Button onClick={onStartOver}>Import another file</Button>
      </div>
    </div>
  );
}
