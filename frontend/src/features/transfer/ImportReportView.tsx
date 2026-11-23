import type { ReactElement } from 'react';
import type { ImportReport, SkippedRecord } from '../../api/types';
import { useT } from '../../i18n/languageContext';
import { localeOf } from '../../i18n/languages';
import styles from './Transfer.module.scss';

export interface ImportReportViewProps {
  fileName: string;
  report: ImportReport;
}

export function ImportReportView({ fileName, report }: ImportReportViewProps): ReactElement {
  const t = useT();
  return (
    <div className={styles.report}>
      <p className={styles.reportTitle} role="status">
        {t('transfer.readyToImport', { fileName })}
      </p>
      <dl className={styles.counts}>
        <Count term={t('transfer.people')} count={report.people_count} />
        <Count term={t('transfer.parentLinks')} count={report.parent_link_count} />
        <Count term={t('transfer.marriages')} count={report.partnership_count} />
        <Count term={t('transfer.photos')} count={report.photo_count} />
      </dl>
      {report.skipped.length > 0 && <SkippedRecords skipped={report.skipped} />}
    </div>
  );
}

function Count({ term, count }: { term: string; count: number }): ReactElement {
  const t = useT();
  return (
    <div className={styles.count}>
      <dt>{term}</dt>
      <dd>{count.toLocaleString(localeOf(t.language))}</dd>
    </div>
  );
}

function SkippedRecords({ skipped }: { skipped: readonly SkippedRecord[] }): ReactElement {
  const t = useT();
  return (
    <details className={styles.skipped}>
      <summary>{t('transfer.skipped', { count: skipped.length })}</summary>
      <ul className={styles.skippedList}>
        {skipped.map((record, index) => (
          <li key={`${record.location}-${String(index)}`}>
            <span className={styles.skippedLocation}>{record.location}</span> {record.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}
