import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { http } from 'msw';
import { expect, test, vi } from 'vitest';
import { DARWIN_IDS, namedProfile } from '../../test/fixtures';
import { apiErrorResponse } from '../../test/handlers';
import { fakeBackend, mockServer, recordChangeRequests, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

function findSection(name: string): Promise<HTMLElement> {
  return screen.findByRole('region', { name });
}

async function openAddParentOfEmma(user: UserEvent): Promise<HTMLElement> {
  await user.click(within(await findSection('Parents')).getByRole('button', { name: 'Add parent' }));
  return screen.getByRole('dialog', { name: 'Add a parent of Emma Wedgwood' });
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

test('adding a parent with an empty search box asks for a name or a choice', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  await user.click(within(await findSection('Parents')).getByRole('button', { name: 'Add parent' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add parent' }));
  expect(screen.getByRole('combobox', { name: 'Person' })).toHaveAccessibleDescription('Type a name or choose a parent from the suggestions.');
});

test('a kinship rule violation from the server is shown inside the dialog', async () => {
  mockServer.use(http.post('/api/parent-links/', () => apiErrorResponse(400, { code: 'kinship.cycle', message: 'The child is already an ancestor of this parent.' })));
  const { user } = renderApp(`/people/${String(DARWIN_IDS.charles)}`);
  await user.click(within(await findSection('Parents')).getByRole('button', { name: 'Add parent' }));
  const dialog = screen.getByRole('dialog');
  await user.click(within(dialog).getByRole('combobox', { name: 'Person' }));
  await user.click(await within(dialog).findByRole('option', { name: /Emma Wedgwood/ }));
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('The child is already an ancestor of this parent.');
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
  await waitFor(() => {
    expect(within(parents).getByRole('button', { name: 'Add parent' })).toHaveFocus();
  });
});

test('adding a child links the chosen person as a child', async () => {
  const createParentLink = vi.spyOn(fakeBackend, 'createParentLink');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.robert)}`);
  await user.click(within(await findSection('Children')).getByRole('button', { name: 'Add child' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a child of Robert Waring Darwin' });
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'emma');
  await waitFor(() => {
    expect(within(within(dialog).getByRole('listbox', { name: 'Person' })).getAllByRole('option')).toHaveLength(2);
  });
  await user.keyboard('{ArrowDown}{Enter}');
  await user.click(within(dialog).getByRole('button', { name: 'Add child' }));
  await waitFor(() => {
    expect(createParentLink).toHaveBeenCalledWith({ parent_id: DARWIN_IDS.robert, child_id: DARWIN_IDS.emma, kind: 'birth' });
  });
  expect(await within(screen.getByRole('region', { name: 'Children' })).findByRole('link', { name: 'Emma Wedgwood' })).toBeInTheDocument();
});

test('a typed name is offered as a new person after the matches, and alone when nobody matches', async () => {
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  const dialog = await openAddParentOfEmma(user);
  const search = within(dialog).getByRole('combobox', { name: 'Person' });
  const suggestions = (): HTMLElement[] => within(within(dialog).getByRole('listbox', { name: 'Person' })).getAllByRole('option');
  await user.type(search, 'darwin');
  await waitFor(() => {
    expect(suggestions()).toHaveLength(4);
  });
  expect(suggestions()[0]).toHaveAccessibleName(/^Charles Robert Darwin/);
  expect(suggestions().at(-1)).toHaveAccessibleName('Add “darwin” as a new person');
  await user.clear(search);
  await user.type(search, 'Elizabeth Allen');
  await waitFor(() => {
    expect(suggestions()).toHaveLength(1);
  });
  expect(suggestions()[0]).toHaveAccessibleName('Add “Elizabeth Allen” as a new person');
  expect(within(dialog).queryByText('No one matches')).not.toBeInTheDocument();
});

test('a new parent is added from a two-word name with one request', async () => {
  const changeRequests = recordChangeRequests();
  const addNewParent = vi.spyOn(fakeBackend, 'addNewParent');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  const dialog = await openAddParentOfEmma(user);
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'Elizabeth Allen');
  await user.click(await within(dialog).findByRole('option', { name: 'Add “Elizabeth Allen” as a new person' }));
  expect(within(dialog).getByRole('textbox', { name: 'Given names' })).toHaveValue('Elizabeth');
  expect(within(dialog).getByRole('textbox', { name: 'Given names' })).toHaveFocus();
  expect(within(dialog).getByRole('textbox', { name: 'Surname' })).toHaveValue('Allen');
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Sex' }), 'Female');
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Relationship' }), 'Adopted');
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  expect(changeRequests).toEqual([`POST /api/people/${String(DARWIN_IDS.emma)}/parents/`]);
  expect(addNewParent).toHaveBeenCalledWith(DARWIN_IDS.emma, { person: namedProfile('Elizabeth', 'Allen', 'female'), kind: 'adopted' });
  expect(await within(screen.getByRole('region', { name: 'Parents' })).findByRole('link', { name: 'Elizabeth Allen' })).toBeInTheDocument();
});

test('a one-word name for a new child takes the surname of the parent', async () => {
  const changeRequests = recordChangeRequests();
  const addNewChild = vi.spyOn(fakeBackend, 'addNewChild');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.robert)}`);
  await user.click(within(await findSection('Children')).getByRole('button', { name: 'Add child' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a child of Robert Waring Darwin' });
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'Marianne');
  await user.click(await within(dialog).findByRole('option', { name: 'Add “Marianne” as a new person' }));
  expect(within(dialog).getByRole('textbox', { name: 'Given names' })).toHaveValue('Marianne');
  expect(within(dialog).getByRole('textbox', { name: 'Surname' })).toHaveValue('Darwin');
  await user.click(within(dialog).getByRole('button', { name: 'Add child' }));
  await waitFor(() => {
    expect(changeRequests).toEqual([`POST /api/people/${String(DARWIN_IDS.robert)}/children/`]);
  });
  expect(addNewChild).toHaveBeenCalledWith(DARWIN_IDS.robert, { person: namedProfile('Marianne', 'Darwin'), kind: 'birth' });
  expect(await within(screen.getByRole('region', { name: 'Children' })).findByRole('link', { name: 'Marianne Darwin' })).toBeInTheDocument();
});

test('pressing Add with a typed one-word name opens the new-person form, which needs a name', async () => {
  const changeRequests = recordChangeRequests();
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  const dialog = await openAddParentOfEmma(user);
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'Josiah');
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  const givenNames = within(dialog).getByRole('textbox', { name: 'Given names' });
  expect(givenNames).toHaveValue('Josiah');
  expect(within(dialog).getByRole('textbox', { name: 'Surname' })).toHaveValue('');
  expect(within(dialog).queryByRole('combobox', { name: 'Person' })).not.toBeInTheDocument();
  await user.clear(givenNames);
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  expect(givenNames).toHaveAccessibleDescription('Enter a given name or a surname.');
  expect(changeRequests).toEqual([]);
  await user.type(givenNames, 'Josiah');
  expect(givenNames).not.toHaveAccessibleDescription();
});

test('a refusal from the server is shown in the new-person form', async () => {
  mockServer.use(http.post('/api/people/:personId/parents/', () => apiErrorResponse(400, { code: 'workspace.limit_reached', message: 'The demo sandbox holds at most 300 people.' })));
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  const dialog = await openAddParentOfEmma(user);
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'Elizabeth Allen');
  await user.click(await within(dialog).findByRole('option', { name: 'Add “Elizabeth Allen” as a new person' }));
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('The demo sandbox holds at most 300 people.');
  expect(within(dialog).getByRole('textbox', { name: 'Given names' })).toHaveValue('Elizabeth');
});

test('back to search returns to the typed text and an existing person can still be chosen', async () => {
  const createParentLink = vi.spyOn(fakeBackend, 'createParentLink');
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}`);
  const dialog = await openAddParentOfEmma(user);
  await user.type(within(dialog).getByRole('combobox', { name: 'Person' }), 'robert');
  await user.click(await within(dialog).findByRole('option', { name: 'Add “robert” as a new person' }));
  await user.click(within(dialog).getByRole('button', { name: 'Back to search' }));
  const search = within(dialog).getByRole('combobox', { name: 'Person' });
  expect(search).toHaveValue('robert');
  expect(search).toHaveFocus();
  expect(within(dialog).queryByRole('textbox', { name: 'Given names' })).not.toBeInTheDocument();
  await user.click(search);
  await user.click(await within(dialog).findByRole('option', { name: /Robert Waring Darwin/ }));
  await user.click(within(dialog).getByRole('button', { name: 'Add parent' }));
  await waitFor(() => {
    expect(createParentLink).toHaveBeenCalledWith({ parent_id: DARWIN_IDS.robert, child_id: DARWIN_IDS.emma, kind: 'birth' });
  });
});
