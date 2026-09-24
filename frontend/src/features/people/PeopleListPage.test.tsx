import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { expect, test } from 'vitest';
import { emptyFamily, storedPerson } from '../../test/fixtures';
import { apiErrorResponse } from '../../test/handlers';
import { fakeBackend, mockServer, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

function listedPeople(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'People in your tree' })).getAllByRole('link');
}

function expectListedInOrder(names: string[]): void {
  expect(listedPeople()).toEqual(names.map((name) => screen.getByRole('link', { name })));
}

test('the list shows everyone by surname with their life years and links to profiles', async () => {
  renderApp('/people');
  expect(await screen.findByRole('link', { name: /Charles Robert Darwin/ })).toHaveAttribute('href', '/people/1');
  expectListedInOrder([
    'Charles Robert Darwin 1809–1882',
    'Robert Waring Darwin 1766–1848',
    'William Erasmus Darwin b. 1839',
    'Emma Wedgwood 1808–1896',
    'Susannah Wedgwood c. 1765–1817',
  ]);
  expect(screen.getByText('Showing 5 of 5 people.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Add person' })).toHaveAttribute('href', '/people/new');
});

test('searching filters the list and keeps the search in the address', async () => {
  const { user, router } = renderApp('/people');
  await screen.findByRole('link', { name: /Charles Robert Darwin/ });
  await user.type(screen.getByRole('searchbox', { name: 'Search people' }), 'wedg');
  await waitFor(() => {
    expect(router.state.location.search).toBe('?search=wedg');
  });
  expect(await screen.findByText('Showing 2 of 2 people matching “wedg”.')).toBeInTheDocument();
  expectListedInOrder(['Emma Wedgwood 1808–1896', 'Susannah Wedgwood c. 1765–1817']);
});

test('a search in the address is applied when the page opens', async () => {
  renderApp('/people?search=emma');
  expect(await screen.findByRole('searchbox', { name: 'Search people' })).toHaveValue('emma');
  expect(await screen.findByText('Showing 1 of 1 people matching “emma”.')).toBeInTheDocument();
});

test('a search without matches says so and can be cleared', async () => {
  const { user } = renderApp('/people?search=zzz');
  expect(await screen.findByRole('heading', { name: 'No one matches “zzz”' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getByRole('searchbox', { name: 'Search people' })).toHaveValue('');
  expect(await screen.findByRole('link', { name: /Emma Wedgwood/ })).toBeInTheDocument();
});

test('an empty tree invites to add or import people', async () => {
  fakeBackend.seed(emptyFamily());
  renderApp('/people');
  expect(await screen.findByRole('heading', { name: 'No people yet' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Import a GEDCOM file' })).toHaveAttribute('href', '/transfer');
});

test('a failed load can be retried', async () => {
  mockServer.use(http.get('/api/people/', () => apiErrorResponse(500, { code: 'server.error', message: 'The server failed.' })));
  const { user } = renderApp('/people');
  expect(await screen.findByRole('heading', { name: 'Cannot reach the server' })).toBeInTheDocument();
  mockServer.resetHandlers();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: /Emma Wedgwood/ })).toBeInTheDocument();
});

test('long lists load more people on request', async () => {
  const people = Array.from({ length: 60 }, (_unused, index) => storedPerson({ id: index + 1, givenNames: `Child ${String(index + 1).padStart(2, '0')}`, surname: 'Darwin' }));
  fakeBackend.seed({ ...emptyFamily(), people });
  const { user } = renderApp('/people');
  expect(await screen.findByText('Showing 50 of 60 people.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Load more' }));
  expect(await screen.findByText('Showing 60 of 60 people.')).toBeInTheDocument();
  expect(listedPeople()).toHaveLength(60);
  expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});
