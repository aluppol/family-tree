import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, useState } from 'react';
import { expect, test } from 'vitest';
import { type DateDraft, EMPTY_DATE_DRAFT, parseDateDraft } from './dateDraft';
import { GenealogicalDateField } from './GenealogicalDateField';

function BirthDateHarness({ error, initialDraft = EMPTY_DATE_DRAFT }: { error?: string; initialDraft?: DateDraft }): ReactElement {
  const [draft, setDraft] = useState(initialDraft);
  return (
    <>
      <GenealogicalDateField legend="Date of birth" draft={draft} onDraftChange={setDraft} error={error} />
      <output>{JSON.stringify(parseDateDraft(draft).date)}</output>
    </>
  );
}

function producedDate(): unknown {
  return JSON.parse(screen.getByRole('status').textContent);
}

test('the parts of a date produce a genealogical date', async () => {
  render(<BirthDateHarness />);
  const group = screen.getByRole('group', { name: 'Date of birth' });
  await userEvent.selectOptions(within(group).getByRole('combobox', { name: 'Qualifier' }), 'About');
  await userEvent.type(within(group).getByRole('textbox', { name: 'Day' }), '12');
  await userEvent.selectOptions(within(group).getByRole('combobox', { name: 'Month' }), 'February');
  await userEvent.type(within(group).getByRole('textbox', { name: 'Year' }), '1809');
  expect(producedDate()).toEqual({ qualifier: 'about', value: { year: 1809, month: 2, day: 12 }, until: null });
});

test('choosing Between reveals the second date', async () => {
  render(<BirthDateHarness />);
  const group = screen.getByRole('group', { name: 'Date of birth' });
  expect(screen.queryByRole('group', { name: 'and' })).not.toBeInTheDocument();
  await userEvent.selectOptions(within(group).getByRole('combobox', { name: 'Qualifier' }), 'Between');
  await userEvent.type(within(group).getAllByRole('textbox', { name: 'Year' })[0] ?? group, '1760');
  const secondDate = screen.getByRole('group', { name: 'and' });
  await userEvent.type(within(secondDate).getByRole('textbox', { name: 'Year' }), '1762');
  expect(producedDate()).toEqual({ qualifier: 'between', value: { year: 1760, month: null, day: null }, until: { year: 1762, month: null, day: null } });
});

test('an error marks the input that caused it and describes it', () => {
  const dayWithoutMonth: DateDraft = { ...EMPTY_DATE_DRAFT, value: { day: '12', month: '', year: '1809' } };
  render(<BirthDateHarness initialDraft={dayWithoutMonth} error="Choose a month for this day." />);
  const month = screen.getByRole('combobox', { name: 'Month' });
  expect(month).toHaveAttribute('aria-invalid', 'true');
  expect(month).toHaveAccessibleDescription('Choose a month for this day.');
  expect(screen.getByRole('textbox', { name: 'Day' })).not.toHaveAttribute('aria-invalid');
});

test('a server error on a valid draft marks the year', () => {
  const validDraft: DateDraft = { ...EMPTY_DATE_DRAFT, value: { day: '', month: '', year: '1809' } };
  render(<BirthDateHarness initialDraft={validDraft} error="A person cannot be born after their child." />);
  expect(screen.getByRole('textbox', { name: 'Year' })).toHaveAccessibleDescription('A person cannot be born after their child.');
});
