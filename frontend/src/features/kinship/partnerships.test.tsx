import { screen, waitFor, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { DARWIN_IDS, exactDate } from '../../test/fixtures';
import { fakeBackend, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

function findSpouses(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Spouses' });
}

test('adding a spouse records a marriage with its wedding date and place', async () => {
  const createPartnership = vi.spyOn(fakeBackend, 'createPartnership');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.robert)}`);
  const spouses = await findSpouses();
  expect(spouses).toHaveTextContent('No spouses recorded yet.');
  await user.click(within(spouses).getByRole('button', { name: 'Add spouse' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a spouse of Robert Waring Darwin' });
  await user.type(within(dialog).getByRole('combobox', { name: 'Spouse' }), 'susannah');
  await user.click(await within(dialog).findByRole('option', { name: /Susannah Wedgwood/ }));
  await user.type(within(within(dialog).getByRole('group', { name: 'Wedding date' })).getByRole('textbox', { name: 'Year' }), '1796');
  await user.type(within(dialog).getByRole('textbox', { name: 'Wedding place (optional)' }), 'Marylebone');
  await user.click(within(dialog).getByRole('button', { name: 'Add spouse' }));
  await waitFor(() => {
    expect(createPartnership).toHaveBeenCalledWith({
      first_partner_id: DARWIN_IDS.robert,
      second_partner_id: DARWIN_IDS.susannah,
      terms: { kind: 'marriage', start: { date: exactDate(1796), place: 'Marylebone' }, end: null },
    });
  });
  expect(await within(spouses).findByText('Married 1796, Marylebone')).toBeInTheDocument();
});

test('a spouse must be chosen and an impossible date is refused before sending', async () => {
  const createPartnership = vi.spyOn(fakeBackend, 'createPartnership');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.robert)}`);
  await user.click(within(await findSpouses()).getByRole('button', { name: 'Add spouse' }));
  const dialog = screen.getByRole('dialog');
  await user.type(within(within(dialog).getByRole('group', { name: 'Wedding date' })).getByRole('textbox', { name: 'Year' }), '0');
  await user.click(within(dialog).getByRole('button', { name: 'Add spouse' }));
  expect(within(dialog).getByRole('combobox', { name: 'Spouse' })).toHaveAccessibleDescription('Choose a spouse from the suggestions.');
  expect(within(dialog).getByText('Year must be a whole number from 1 to 9999.')).toBeInTheDocument();
  expect(createPartnership).not.toHaveBeenCalled();
});

test('a marriage can be given an end and offers no other kind', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  const spouses = await findSpouses();
  await user.click(within(spouses).getByRole('button', { name: 'Edit Emma Wedgwood' }));
  const dialog = screen.getByRole('dialog', { name: 'Marriage with Emma Wedgwood' });
  expect(within(dialog).queryByRole('combobox', { name: 'Kind' })).not.toBeInTheDocument();
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Ended by' }), 'Separation');
  await user.type(within(within(dialog).getByRole('group', { name: 'End date' })).getByRole('textbox', { name: 'Year' }), '1850');
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(await within(spouses).findByText('Married 29 Jan 1839, Maer · Separated 1850')).toBeInTheDocument();
});

test('removing a marriage asks for confirmation', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  const spouses = await findSpouses();
  await user.click(within(spouses).getByRole('button', { name: 'Remove Emma Wedgwood' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Remove the marriage with Emma Wedgwood?' })).getByRole('button', { name: 'Remove marriage' }));
  expect(await within(spouses).findByText('No spouses recorded yet.')).toBeInTheDocument();
});

test('each spouse is called husband or wife by sex', async () => {
  renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  expect(within(await findSpouses()).getByText('Wife')).toBeInTheDocument();
});
