import type { ReactElement } from 'react';
import { gedcomExportUrl } from '../../api/gedcom';
import type { ExportFormat } from '../../api/types';
import { ButtonAnchor, CardSection, Icon, PageContainer, PageHeader } from '../../design/components';
import type { TextKey } from '../../i18n/catalogue';
import { useT } from '../../i18n/languageContext';
import type { Translate } from '../../i18n/translate';
import { type ImportStep, ImportStepView } from './ImportStepView';
import styles from './Transfer.module.scss';

interface ExportChoice {
  format: ExportFormat;
  label: string;
  descriptionKey: TextKey;
}

const MEGABYTE = 1024 * 1024;

const EXPORT_CHOICES: readonly ExportChoice[] = [
  { format: 'gedcom-7.0', label: 'GEDCOM 7.0', descriptionKey: 'transfer.gedcom7' },
  { format: 'gedcom-5.5.1', label: 'GEDCOM 5.5.1', descriptionKey: 'transfer.gedcom551' },
  { format: 'gedzip', label: 'GEDZIP', descriptionKey: 'transfer.gedzip' },
];

export interface TransferViewProps {
  step: ImportStep;
  largestUploadBytes: number | undefined;
  onFileSelect: (file: File) => void;
  onImport: () => void;
  onStartOver: () => void;
}

export function TransferView({ step, largestUploadBytes, onFileSelect, onImport, onStartOver }: TransferViewProps): ReactElement {
  const t = useT();
  return (
    <PageContainer>
      <PageHeader title={t('transfer.title')} description={t('transfer.description')} />
      <div className={styles.columns}>
        <CardSection title={t('transfer.importSection')}>
          <p className={styles.explanation}>{importExplanation(t, largestUploadBytes)}</p>
          <ImportStepView step={step} onFileSelect={onFileSelect} onImport={onImport} onStartOver={onStartOver} />
        </CardSection>
        <ExportSection />
      </div>
    </PageContainer>
  );
}

function importExplanation(t: Translate, largestUploadBytes: number | undefined): string {
  return largestUploadBytes === undefined ? t('transfer.importExplanation') : t('transfer.importExplanationWithLimit', { megabytes: largestUploadBytes / MEGABYTE });
}

function ExportSection(): ReactElement {
  const t = useT();
  return (
    <CardSection title={t('transfer.exportSection')}>
      <p className={styles.explanation}>{t('transfer.exportExplanation')}</p>
      <ul className={styles.exportChoices}>
        {EXPORT_CHOICES.map((choice) => (
          <li key={choice.format} className={styles.exportChoice}>
            <ButtonAnchor href={gedcomExportUrl(choice.format)} download>
              <Icon name="download" />
              {choice.label}
            </ButtonAnchor>
            <span className={styles.exportDescription}>{t(choice.descriptionKey)}</span>
          </li>
        ))}
      </ul>
    </CardSection>
  );
}
