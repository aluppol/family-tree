import { type ChangeEvent, type ReactElement, useId } from 'react';
import type { DateQualifier } from '../../api/types';
import { SelectField, type SelectOption, TextField } from '../../design/components';
import { type CalendarDraft, type CalendarPart, type DateDraft, type DateInputName, parseDateDraft } from './dateDraft';
import styles from './GenealogicalDateField.module.scss';

const QUALIFIER_OPTIONS: readonly SelectOption<DateQualifier>[] = [
  { value: 'exact', label: 'Exact' },
  { value: 'about', label: 'About' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'estimated', label: 'Estimated' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MONTH_OPTIONS: readonly SelectOption<string>[] = [
  { value: '', label: '—' },
  ...MONTH_NAMES.map((label, index) => ({ value: String(index + 1), label })),
];

export interface GenealogicalDateFieldProps {
  legend: string;
  draft: DateDraft;
  onDraftChange: (draft: DateDraft) => void;
  error?: string;
}

export function GenealogicalDateField({ legend, draft, onDraftChange, error }: GenealogicalDateFieldProps): ReactElement {
  const errorId = useId();
  const invalidInput = error === undefined ? undefined : (parseDateDraft(draft).problem?.inputName ?? 'value.year');
  const marking: ErrorMarking = { errorId, invalidInput };
  function handleQualifierChange(qualifier: DateQualifier): void {
    onDraftChange({ ...draft, qualifier });
  }
  return (
    <fieldset className={styles.dateField}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.row}>
        <SelectField className={styles.qualifier} label="Qualifier" options={QUALIFIER_OPTIONS} value={draft.qualifier} onValueChange={handleQualifierChange} />
        <CalendarInputs part="value" draft={draft} onDraftChange={onDraftChange} marking={marking} />
      </div>
      {draft.qualifier === 'between' && (
        <fieldset className={styles.secondDate}>
          <legend className={styles.secondLegend}>and</legend>
          <CalendarInputs part="until" draft={draft} onDraftChange={onDraftChange} marking={marking} />
        </fieldset>
      )}
      {error !== undefined && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface ErrorMarking {
  errorId: string;
  invalidInput: DateInputName | undefined;
}

interface InputMarking {
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface CalendarInputsProps {
  part: CalendarPart;
  draft: DateDraft;
  onDraftChange: (draft: DateDraft) => void;
  marking: ErrorMarking;
}

function CalendarInputs({ part, draft, onDraftChange, marking }: CalendarInputsProps): ReactElement {
  const calendar = draft[part];
  function change(update: Partial<CalendarDraft>): void {
    onDraftChange({ ...draft, [part]: { ...calendar, ...update } });
  }
  return (
    <div className={styles.calendar}>
      <NumberInput label="Day" className={styles.day} maxLength={2} value={calendar.day} onValueChange={(day) => { change({ day }); }} marking={markingFor(marking, `${part}.day`)} />
      <SelectField className={styles.month} label="Month" options={MONTH_OPTIONS} value={calendar.month} onValueChange={(month) => { change({ month }); }} {...markingFor(marking, `${part}.month`)} />
      <NumberInput label="Year" className={styles.year} maxLength={4} value={calendar.year} onValueChange={(year) => { change({ year }); }} marking={markingFor(marking, `${part}.year`)} />
    </div>
  );
}

interface NumberInputProps {
  label: string;
  className: string | undefined;
  maxLength: number;
  value: string;
  onValueChange: (value: string) => void;
  marking: InputMarking;
}

function NumberInput({ label, className, maxLength, value, onValueChange, marking }: NumberInputProps): ReactElement {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onValueChange(event.target.value);
  }
  return <TextField className={className} label={label} inputMode="numeric" autoComplete="off" maxLength={maxLength} value={value} onChange={handleChange} {...marking} />;
}

function markingFor(marking: ErrorMarking, inputName: DateInputName): InputMarking {
  return marking.invalidInput === inputName ? { 'aria-invalid': true, 'aria-describedby': marking.errorId } : {};
}
