import type { ReactElement } from 'react';
import { gedcomExportUrl } from '../../api/gedcom';
import type { ExportFormat } from '../../api/types';
import { ButtonAnchor, CardSection, Icon, PageContainer, PageHeader } from '../../design/components';
import { type ImportStep, ImportStepView } from './ImportStepView';
import styles from './Transfer.module.scss';

interface ExportChoice {
  format: ExportFormat;
  label: string;
  description: string;
}

const EXPORT_CHOICES: readonly ExportChoice[] = [
  { format: 'gedcom-7.0', label: 'GEDCOM 7.0', description: 'The current standard, for up-to-date genealogy programs.' },
  { format: 'gedcom-5.5.1', label: 'GEDCOM 5.5.1', description: 'The classic format almost every program can read.' },
  { format: 'gedzip', label: 'GEDZIP', description: 'GEDCOM 7.0 packed together with the photos.' },
];

export interface TransferViewProps {
  step: ImportStep;
  onFileSelect: (file: File) => void;
  onImport: () => void;
  onStartOver: () => void;
}

export function TransferView({ step, onFileSelect, onImport, onStartOver }: TransferViewProps): ReactElement {
  return (
    <PageContainer>
      <PageHeader title="Import & export" description="Bring in a family from another genealogy program, or take yours with you." />
      <div className={styles.columns}>
        <CardSection title="Import a GEDCOM file">
          <p className={styles.explanation}>
            GEDCOM 5.5.1 or 7.0 (.ged) or GEDZIP (.gdz or .zip), up to 20 MB. The people in the file are added to your tree; nothing already in it
            is changed.
          </p>
          <ImportStepView step={step} onFileSelect={onFileSelect} onImport={onImport} onStartOver={onStartOver} />
        </CardSection>
        <ExportSection />
      </div>
    </PageContainer>
  );
}

function ExportSection(): ReactElement {
  return (
    <CardSection title="Export your tree">
      <p className={styles.explanation}>Download everyone in your tree in a format other genealogy programs understand.</p>
      <ul className={styles.exportChoices}>
        {EXPORT_CHOICES.map((choice) => (
          <li key={choice.format} className={styles.exportChoice}>
            <ButtonAnchor href={gedcomExportUrl(choice.format)} download>
              <Icon name="download" />
              {choice.label}
            </ButtonAnchor>
            <span className={styles.exportDescription}>{choice.description}</span>
          </li>
        ))}
      </ul>
    </CardSection>
  );
}
