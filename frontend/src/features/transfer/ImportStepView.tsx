import type { ReactElement } from 'react';
import type { ImportReport, ImportResult } from '../../api/types';
import { Banner, Button, ButtonLink, FileButton, Icon, InlineError, LoadingState } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { HOME_PATH, towerPath } from '../../routePaths';
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
  const t = useT();
  switch (step.step) {
    case 'choose':
      return <GedcomFileButton label={t('transfer.chooseFile')} onFileSelect={onFileSelect} />;
    case 'reading':
      return <LoadingState label={t('transfer.reading', { fileName: step.fileName })} />;
    case 'unreadable':
      return (
        <div className={styles.step}>
          <InlineError error={step.error} />
          <GedcomFileButton label={t('transfer.chooseAnother')} onFileSelect={onFileSelect} />
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
  const t = useT();
  return (
    <div className={styles.step}>
      <ImportReportView fileName={step.fileName} report={step.report} />
      <InlineError error={step.importError} />
      <div className={styles.stepActions}>
        <Button variant="primary" onClick={onImport} aria-disabled={step.isImporting}>
          {step.isImporting ? t('transfer.importing') : t('transfer.importPeople', { count: step.report.people_count })}
        </Button>
        <FileButton label={t('transfer.chooseAnother')} accept={ACCEPTED_GEDCOM_FILES} onFileSelect={onFileSelect} disabled={step.isImporting} />
      </div>
    </div>
  );
}

function DoneStep({ result, onStartOver }: { result: ImportResult; onStartOver: () => void }): ReactElement {
  const t = useT();
  const counts = {
    people: t('transfer.peopleCount', { count: result.people_count }),
    parentLinks: t('transfer.parentLinkCount', { count: result.parent_link_count }),
    marriages: t('transfer.marriageCount', { count: result.partnership_count }),
  };
  return (
    <div className={styles.step}>
      <Banner tone="success">
        <p role="status">{t('transfer.imported', counts)}</p>
      </Banner>
      <div className={styles.stepActions}>
        <ButtonLink to={result.home_person_id === null ? HOME_PATH : towerPath(result.home_person_id)} variant="primary">
          <Icon name="tree" />
          {t('transfer.showTree')}
        </ButtonLink>
        <Button onClick={onStartOver}>{t('transfer.importAnother')}</Button>
      </div>
    </div>
  );
}
