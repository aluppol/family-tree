import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { expect, test, vi } from 'vitest';
import { DARWIN_IDS } from '../../test/fixtures';
import { apiErrorResponse } from '../../test/handlers';
import { fakeBackend, mockServer, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

function findSection(name: string): Promise<HTMLElement> {
  return screen.findByRole('region', { name });
}

test('adding a parent picks a candidate, sets the kind and shows the new parent', async () => {
  const createParentLink = vi.spyOn(fakeBackend, 'createParentLink');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  await user.click(within(await findSection('Parents')).getByRole('button', { name: 'Add parent' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a parent of Emma Wedgwood' });
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'robert');
  await user.click(await within(dialog).findByRole('option', { name: /Robert Waring Darwin/ }));
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Relationship' }), 'Adopted');
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  expect(createParentLink).toHaveBeenCalledWith({ parent_id: DARWIN_IDS.robert, child_id: DARWIN_IDS.emma, kind: 'adopted' });
  const parents = screen.getByRole('region', { name: 'Parents' });
  expect(await within(parents).findByRole('link', { name: 'Robert Waring Darwin' })).toBeInTheDocument();
  expect(parents).toHaveTextContent('Adopted');
});

test('adding a parent without choosing a person asks for one', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  await user.click(within(await findSection('Parents')).getByRole('button', { name: 'Add parent' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add parent' }));
  expect(screen.getByRole('combobox', { name: 'Person' })).toHaveAccessibleDescription('Choose a parent from the suggestions.');
});

test('a kinship rule violation from the server is shown inside the dialog', async () => {
  mockServer.use(http.post('/api/parent-links/', () => apiErrorResponse(400, { code: 'kinship.cycle', message: 'William Erasmus Darwin is a descendant of Charles Robert Darwin.' })));
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  await user.click(within(await findSection('Parents')).getByRole('button', { name: 'Add parent' }));
  const dialog = screen.getByRole('dialog');
  await user.click(within(dialog).getByRole('combobox', { name: 'Person' }));
  await user.click(await within(dialog).findByRole('option', { name: /Emma Wedgwood/ }));
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('William Erasmus Darwin is a descendant of Charles Robert Darwin.');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('the kind of a parent link can be changed', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  const parents = await findSection('Parents');
  await user.click(within(parents).getByRole('button', { name: 'Change Robert Waring Darwin' }));
  const dialog = screen.getByRole('dialog', { name: 'Change relationship' });
  expect(dialog).toHaveTextContent('Robert Waring Darwin is recorded as a parent of Charles Robert Darwin.');
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Relationship' }), 'Foster');
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(await within(parents).findByText('Foster')).toBeInTheDocument();
});

test('removing a parent link asks for confirmation and keeps both people', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  const parents = await findSection('Parents');
  await user.click(within(parents).getByRole('button', { name: 'Remove Susannah Wedgwood' }));
  const dialog = screen.getByRole('dialog', { name: 'Remove Susannah Wedgwood as parent?' });
  expect(dialog).toHaveTextContent('Both people stay in your tree.');
  await user.click(within(dialog).getByRole('button', { name: 'Remove link' }));
  await waitFor(() => {
    expect(within(parents).queryByRole('link', { name: 'Susannah Wedgwood' })).not.toBeInTheDocument();
  });
  expect(fakeBackend.person(DARWIN_IDS.susannah)).toBeDefined();
});

test('adding a child links the chosen person as a child', async () => {
  const createParentLink = vi.spyOn(fakeBackend, 'createParentLink');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.robert)}`);
  await user.click(within(await findSection('Children')).getByRole('button', { name: 'Add child' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a child of Robert Waring Darwin' });
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'emma');
  await waitFor(() => {
    expect(within(within(dialog).getByRole('listbox', { name: 'Person' })).getAllByRole('option')).toHaveLength(1);
  });
  await user.keyboard('{ArrowDown}{Enter}');
  await user.click(within(dialog).getByRole('button', { name: 'Add child' }));
  await waitFor(() => {
    expect(createParentLink).toHaveBeenCalledWith({ parent_id: DARWIN_IDS.robert, child_id: DARWIN_IDS.emma, kind: 'birth' });
  });
  expect(await within(screen.getByRole('region', { name: 'Children' })).findByRole('link', { name: 'Emma Wedgwood' })).toBeInTheDocument();
});
