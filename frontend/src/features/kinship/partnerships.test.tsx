import { screen, waitFor, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { DARWIN_IDS, exactDate } from '../../test/fixtures';
import { fakeBackend, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

function findPartners(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Partners' });
}

test('adding a partner records the kind and the start of the partnership', async () => {
  const createPartnership = vi.spyOn(fakeBackend, 'createPartnership');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.robert)}`);
  const partners = await findPartners();
  expect(partners).toHaveTextContent('No partners recorded yet.');
  await user.click(within(partners).getByRole('button', { name: 'Add partner' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a partner of Robert Waring Darwin' });
  await user.type(within(dialog).getByRole('combobox', { name: 'Partner' }), 'susannah');
  await user.click(await within(dialog).findByRole('option', { name: /Susannah Wedgwood/ }));
  await user.type(within(within(dialog).getByRole('group', { name: 'Start date' })).getByRole('textbox', { name: 'Year' }), '1796');
  await user.type(within(dialog).getByRole('textbox', { name: 'Start place (optional)' }), 'Marylebone');
  await user.click(within(dialog).getByRole('button', { name: 'Add partner' }));
  await waitFor(() => {
    expect(createPartnership).toHaveBeenCalledWith({
      first_partner_id: DARWIN_IDS.robert,
      second_partner_id: DARWIN_IDS.susannah,
      terms: { kind: 'marriage', start: { date: exactDate(1796), place: 'Marylebone' }, end: null },
    });
  });
  expect(await within(partners).findByText('Married 1796, Marylebone')).toBeInTheDocument();
});

test('a partner must be chosen and an impossible date is refused before sending', async () => {
  const createPartnership = vi.spyOn(fakeBackend, 'createPartnership');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.robert)}`);
  await user.click(within(await findPartners()).getByRole('button', { name: 'Add partner' }));
  const dialog = screen.getByRole('dialog');
  await user.type(within(within(dialog).getByRole('group', { name: 'Start date' })).getByRole('textbox', { name: 'Year' }), '0');
  await user.click(within(dialog).getByRole('button', { name: 'Add partner' }));
  expect(within(dialog).getByRole('combobox', { name: 'Partner' })).toHaveAccessibleDescription('Choose a partner from the suggestions.');
  expect(within(dialog).getByText('Year must be a whole number from 1 to 9999.')).toBeInTheDocument();
  expect(createPartnership).not.toHaveBeenCalled();
});

test('a partnership can be given an end', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  const partners = await findPartners();
  await user.click(within(partners).getByRole('button', { name: 'Edit Emma Wedgwood' }));
  const dialog = screen.getByRole('dialog', { name: 'Partnership with Emma Wedgwood' });
  expect(within(dialog).getByRole('combobox', { name: 'Kind' })).toHaveValue('marriage');
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Ended by' }), 'Separation');
  await user.type(within(within(dialog).getByRole('group', { name: 'End date' })).getByRole('textbox', { name: 'Year' }), '1850');
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(await within(partners).findByText('Married 29 Jan 1839, Maer · Separated 1850')).toBeInTheDocument();
});

test('removing a partnership asks for confirmation', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  const partners = await findPartners();
  await user.click(within(partners).getByRole('button', { name: 'Remove Emma Wedgwood' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Remove the partnership with Emma Wedgwood?' })).getByRole('button', { name: 'Remove partnership' }));
  expect(await within(partners).findByText('No partners recorded yet.')).toBeInTheDocument();
});
