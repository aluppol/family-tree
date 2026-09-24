import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import type { PartnershipKind } from '../../api/types';
import { CheckboxField } from './CheckboxField';
import { FileButton } from './FileButton';
import { SelectField, type SelectOption } from './SelectField';
import { TextArea } from './TextArea';
import { TextField } from './TextField';

test('TextField labels its input and describes it with the hint and the error', () => {
  render(<TextField label="Surname" hint="The surname at birth." error="Enter a surname." isOptional defaultValue="" />);
  const input = screen.getByRole('textbox', { name: 'Surname (optional)' });
  expect(input).toHaveAccessibleDescription('The surname at birth. Enter a surname.');
  expect(input).toHaveAttribute('aria-invalid', 'true');
});

test('TextField without an error is not marked invalid', () => {
  render(<TextField label="Given names" defaultValue="Emma" />);
  const input = screen.getByRole('textbox', { name: 'Given names' });
  expect(input).not.toHaveAttribute('aria-invalid');
  expect(input).not.toHaveAttribute('aria-describedby');
});

test('TextArea labels its text area and shows its error', () => {
  render(<TextArea label="Life story" error="Too long." defaultValue="" />);
  expect(screen.getByRole('textbox', { name: 'Life story' })).toHaveAccessibleDescription('Too long.');
});

test('SelectField reports the chosen option value', async () => {
  const handleValueChange = vi.fn();
  const options: SelectOption<PartnershipKind>[] = [
    { value: 'marriage', label: 'Marriage' },
    { value: 'partnership', label: 'Partnership' },
  ];
  render(<SelectField label="Kind" options={options} value="marriage" onValueChange={handleValueChange} error="Choose a kind." />);
  const select = screen.getByRole('combobox', { name: 'Kind' });
  expect(select).toHaveAccessibleDescription('Choose a kind.');
  await userEvent.selectOptions(select, 'Partnership');
  expect(handleValueChange).toHaveBeenCalledWith('partnership');
});

test('CheckboxField toggles through its label', async () => {
  function DiedCheckbox(): React.ReactElement {
    const [hasDied, setHasDied] = useState(false);
    return <CheckboxField label="This person has died" hint="Reveals the death fields." checked={hasDied} onChange={(event) => { setHasDied(event.target.checked); }} />;
  }
  render(<DiedCheckbox />);
  const checkbox = screen.getByRole('checkbox', { name: 'This person has died' });
  expect(checkbox).toHaveAccessibleDescription('Reveals the death fields.');
  await userEvent.click(screen.getByText('This person has died'));
  expect(checkbox).toBeChecked();
});

test('FileButton hands over the chosen file and lets the same file be chosen again', async () => {
  const handleFileSelect = vi.fn();
  render(<FileButton label="Choose a file" accept=".ged" onFileSelect={handleFileSelect} />);
  const input = screen.getByLabelText('Choose a file');
  const file = new File(['0 HEAD'], 'family.ged');
  await userEvent.upload(input, file);
  await userEvent.upload(input, file);
  expect(handleFileSelect).toHaveBeenCalledTimes(2);
  expect(handleFileSelect).toHaveBeenCalledWith(file);
  expect(input).toHaveAttribute('accept', '.ged');
});
