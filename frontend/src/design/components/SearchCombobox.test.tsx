import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, useState } from 'react';
import { expect, test, vi } from 'vitest';
import { type ComboboxOption, SearchCombobox } from './SearchCombobox';

const PEOPLE: ComboboxOption[] = [
  { id: 1, label: 'Charles Darwin', description: '1809–1882' },
  { id: 2, label: 'Emma Wedgwood' },
  { id: 3, label: 'Erasmus Darwin' },
];

interface HarnessProps {
  onSelect?: (option: ComboboxOption) => void;
  isLoading?: boolean;
  error?: string;
}

function PersonPicker({ onSelect = vi.fn(), isLoading = false, error }: HarnessProps): ReactElement {
  const [query, setQuery] = useState('');
  const options = PEOPLE.filter((person) => person.label.toLowerCase().includes(query.toLowerCase()));
  return <SearchCombobox label="Person" query={query} onQueryChange={setQuery} options={options} onSelect={onSelect} isLoading={isLoading} error={error} />;
}

test('typing opens the suggestions and announces how many there are', async () => {
  render(<PersonPicker />);
  const input = screen.getByRole('combobox', { name: 'Person' });
  expect(input).toHaveAttribute('aria-expanded', 'false');
  await userEvent.type(input, 'darwin');
  expect(input).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Charles Darwin 1809–1882', 'Erasmus Darwin']);
  expect(screen.getByRole('status')).toHaveTextContent('2 suggestions available.');
});

test('arrow keys move the active option and wrap around', async () => {
  render(<PersonPicker />);
  const input = screen.getByRole('combobox', { name: 'Person' });
  await userEvent.type(input, 'darwin');
  await userEvent.keyboard('{ArrowDown}');
  expect(screen.getByRole('option', { name: /Charles Darwin/ })).toHaveAttribute('aria-selected', 'true');
  expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /Charles Darwin/ }).id);
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  expect(screen.getByRole('option', { name: /Charles Darwin/ })).toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{ArrowUp}');
  expect(screen.getByRole('option', { name: 'Erasmus Darwin' })).toHaveAttribute('aria-selected', 'true');
});

test('Enter chooses the active option and closes the suggestions', async () => {
  const handleSelect = vi.fn();
  render(<PersonPicker onSelect={handleSelect} />);
  const input = screen.getByRole('combobox', { name: 'Person' });
  await userEvent.type(input, 'emma');
  await userEvent.keyboard('{ArrowUp}{Enter}');
  expect(handleSelect).toHaveBeenCalledWith(PEOPLE[1]);
  expect(input).toHaveAttribute('aria-expanded', 'false');
});

test('Escape closes the suggestions first and clears the text second', async () => {
  render(<PersonPicker />);
  const input = screen.getByRole('combobox', { name: 'Person' });
  await userEvent.type(input, 'dar');
  await userEvent.keyboard('{Escape}');
  expect(input).toHaveAttribute('aria-expanded', 'false');
  expect(input).toHaveValue('dar');
  await userEvent.keyboard('{Escape}');
  expect(input).toHaveValue('');
});

test('clicking a suggestion chooses it', async () => {
  const handleSelect = vi.fn();
  render(<PersonPicker onSelect={handleSelect} />);
  await userEvent.click(screen.getByRole('combobox', { name: 'Person' }));
  await userEvent.click(screen.getByRole('option', { name: 'Emma Wedgwood' }));
  expect(handleSelect).toHaveBeenCalledWith(PEOPLE[1]);
});

test('an empty result says so, and leaving the field closes the suggestions', async () => {
  render(<PersonPicker />);
  const input = screen.getByRole('combobox', { name: 'Person' });
  await userEvent.type(input, 'zzz');
  expect(screen.getByText('No matches', { selector: 'p' })).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('No matches');
  await userEvent.tab();
  expect(input).toHaveAttribute('aria-expanded', 'false');
});

test('while loading it announces the search and shows the field error', async () => {
  render(<PersonPicker isLoading error="Choose a person from the suggestions." />);
  const input = screen.getByRole('combobox', { name: 'Person' });
  expect(input).toHaveAccessibleDescription('Choose a person from the suggestions.');
  await userEvent.type(input, 'zzz');
  expect(screen.getByRole('status')).toHaveTextContent('Searching…');
});

test('a single suggestion is announced in the singular', async () => {
  render(<PersonPicker />);
  await userEvent.type(screen.getByRole('combobox', { name: 'Person' }), 'emma');
  expect(screen.getByRole('status')).toHaveTextContent('1 suggestion available.');
});
