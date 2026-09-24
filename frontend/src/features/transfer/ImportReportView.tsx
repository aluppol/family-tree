import type { ReactElement } from 'react';
import type { ImportReport, SkippedRecord } from '../../api/types';
import { countOf } from './countOf';
import styles from './Transfer.module.scss';

export interface ImportReportViewProps {
  fileName: string;
  report: ImportReport;
}

export function ImportReportView({ fileName, report }: ImportReportViewProps): ReactElement {
  return (
    <div className={styles.report}>
      <p className={styles.reportTitle} role="status">
        {fileName} is ready to import.
      </p>
      <dl className={styles.counts}>
        <Count term="People" count={report.people_count} />
        <Count term="Parent links" count={report.parent_link_count} />
        <Count term="Partnerships" count={report.partnership_count} />
        <Count term="Photos" count={report.photo_count} />
      </dl>
      {report.skipped.length > 0 && <SkippedRecords skipped={report.skipped} />}
    </div>
  );
}

function Count({ term, count }: { term: string; count: number }): ReactElement {
  return (
    <div className={styles.count}>
      <dt>{term}</dt>
      <dd>{count.toLocaleString('en')}</dd>
    </div>
  );
}

function SkippedRecords({ skipped }: { skipped: readonly SkippedRecord[] }): ReactElement {
  return (
    <details className={styles.skipped}>
      <summary>{countOf(skipped.length, 'record', 'records')} will be skipped</summary>
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
