import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { http } from 'msw';
import { expect, test, vi } from 'vitest';
import type { PersonProfile } from '../../api/types';
import { DARWIN_IDS, exactDate } from '../../test/fixtures';
import { apiErrorResponse } from '../../test/handlers';
import { fakeBackend, mockServer, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

async function fillBirthDate(user: UserEvent, { day, month, year }: { day: string; month: string; year: string }): Promise<void> {
  const birth = screen.getByRole('group', { name: 'Date of birth' });
  await user.type(within(birth).getByRole('textbox', { name: 'Day' }), day);
  await user.selectOptions(within(birth).getByRole('combobox', { name: 'Month' }), month);
  await user.type(within(birth).getByRole('textbox', { name: 'Year' }), year);
}

test('creating a person sends the profile and opens the new profile', async () => {
  const createPerson = vi.spyOn(fakeBackend, 'createPerson');
  const { user, router } = renderApp('/people/new');
  await user.type(await screen.findByRole('textbox', { name: 'Given names' }), 'Erasmus Alvey');
  await user.type(screen.getByRole('textbox', { name: 'Surname' }), 'Darwin');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sex' }), 'Male');
  await fillBirthDate(user, { day: '26', month: 'December', year: '1804' });
  await user.type(screen.getByRole('textbox', { name: 'Place of birth (optional)' }), 'Shrewsbury');
  await user.type(screen.getByRole('textbox', { name: 'Life story (optional)' }), 'Elder brother.{Enter}Never married.');
  await user.click(screen.getByRole('button', { name: 'Add person' }));
  await waitFor(() => {
    expect(router.state.location.pathname).toMatch(/^\/people\/\d+$/);
  });
  expect(createPerson).toHaveBeenCalledWith<[PersonProfile]>({
    given_names: 'Erasmus Alvey',
    surname: 'Darwin',
    sex: 'male',
    birth: { date: exactDate(1804, 12, 26), place: 'Shrewsbury' },
    death: null,
    biography: 'Elder brother.\nNever married.',
  });
  expect(await screen.findByRole('heading', { level: 1, name: 'Erasmus Alvey Darwin' })).toBeInTheDocument();
});

test('the died checkbox reveals the death fields and records the death', async () => {
  const createPerson = vi.spyOn(fakeBackend, 'createPerson');
  const { user } = renderApp('/people/new');
  await user.type(await screen.findByRole('textbox', { name: 'Surname' }), 'Wedgwood');
  expect(screen.queryByRole('group', { name: 'Date of death' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: 'This person has died' }));
  await user.type(within(screen.getByRole('group', { name: 'Date of death' })).getByRole('textbox', { name: 'Year' }), '1795');
  await user.type(screen.getByRole('textbox', { name: 'Place of death (optional)' }), 'Etruria');
  await user.click(screen.getByRole('button', { name: 'Add person' }));
  await waitFor(() => {
    expect(createPerson).toHaveBeenCalledOnce();
  });
  expect(createPerson.mock.calls[0]?.[0].death).toEqual({ date: exactDate(1795), place: 'Etruria' });
});

test('a person without any name is not sent and the name field gets focus', async () => {
  const createPerson = vi.spyOn(fakeBackend, 'createPerson');
  const { user } = renderApp('/people/new');
  await user.click(await screen.findByRole('button', { name: 'Add person' }));
  const givenNames = screen.getByRole('textbox', { name: 'Given names' });
  expect(givenNames).toHaveAccessibleDescription('Enter a given name or a surname.');
  expect(givenNames).toHaveFocus();
  expect(createPerson).not.toHaveBeenCalled();
});

test('an impossible date is caught before sending and cleared once edited', async () => {
  const { user } = renderApp('/people/new');
  await user.type(await screen.findByRole('textbox', { name: 'Surname' }), 'Darwin');
  await fillBirthDate(user, { day: '31', month: 'April', year: '1809' });
  await user.click(screen.getByRole('button', { name: 'Add person' }));
  const day = within(screen.getByRole('group', { name: 'Date of birth' })).getByRole('textbox', { name: 'Day' });
  expect(day).toHaveAccessibleDescription('Day must be from 1 to 30 for this month.');
  expect(day).toHaveFocus();
  await user.clear(day);
  expect(screen.queryByText('Day must be from 1 to 30 for this month.')).not.toBeInTheDocument();
});

test('editing a person starts from the stored profile and saves the changes', async () => {
  const updatePerson = vi.spyOn(fakeBackend, 'updatePerson');
  const { user, router } = renderApp(`/people/${String(DARWIN_IDS.emma)}/edit`);
  expect(await screen.findByRole('heading', { level: 1, name: 'Edit Emma Wedgwood' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'This person has died' })).toBeChecked();
  const surname = screen.getByRole('textbox', { name: 'Surname' });
  await user.clear(surname);
  await user.type(surname, 'Darwin');
  await user.click(screen.getByRole('checkbox', { name: 'This person has died' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(`/people/${String(DARWIN_IDS.emma)}`);
  });
  expect(updatePerson).toHaveBeenCalledWith(DARWIN_IDS.emma, expect.objectContaining({ surname: 'Darwin', death: null, birth: { date: exactDate(1808, 5, 2), place: 'Maer Hall, Staffordshire' } }));
});

test('server validation errors appear on the matching fields and in an alert', async () => {
  mockServer.use(
    http.put('/api/people/:personId/', () =>
      apiErrorResponse(400, { code: 'profile.born_after_child', message: 'Emma Wedgwood cannot be born after her child.', fields: { 'birth.date': ['Born after the child William.'] } }),
    ),
  );
  const { user } = renderApp(`/people/${String(DARWIN_IDS.emma)}/edit`);
  await user.click(await screen.findByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Emma Wedgwood cannot be born after her child.');
  expect(within(screen.getByRole('group', { name: 'Date of birth' })).getByRole('textbox', { name: 'Year' })).toHaveAccessibleDescription('Born after the child William.');
});

test('editing an unknown person shows not found', async () => {
  renderApp('/people/999/edit');
  expect(await screen.findByRole('heading', { level: 1, name: 'Not found' })).toBeInTheDocument();
});

test('an address that is not a person id shows the not found page', async () => {
  renderApp('/people/abc/edit');
  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
});
