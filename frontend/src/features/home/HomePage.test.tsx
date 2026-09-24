import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { expect, test } from 'vitest';
import { DARWIN_IDS, darwinFamily, emptyFamily, storedPerson } from '../../test/fixtures';
import { apiErrorResponse } from '../../test/handlers';
import { fakeBackend, mockServer, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

test('the home page opens the tree on the home person', async () => {
  const { router } = renderApp('/');
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(`/tree/${String(DARWIN_IDS.charles)}`);
  });
});

test('without a home person the tree opens on the first person in the list', async () => {
  fakeBackend.seed({
    ...emptyFamily(),
    people: [storedPerson({ id: 8, givenNames: 'Emma', surname: 'Wedgwood' }), storedPerson({ id: 9, givenNames: 'Robert', surname: 'Darwin' })],
  });
  const { router } = renderApp('/');
  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/tree/9');
  });
});

test('an empty tree invites to add the first person or import a file', async () => {
  fakeBackend.seed(emptyFamily());
  renderApp('/');
  expect(await screen.findByRole('heading', { level: 1, name: 'Start your family tree' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Add the first person' })).toHaveAttribute('href', '/people/new');
  expect(screen.getByRole('link', { name: 'Import a GEDCOM file' })).toHaveAttribute('href', '/transfer');
});

test('an unreachable server can be retried from the home page', async () => {
  mockServer.use(http.get('/api/workspace/', () => apiErrorResponse(503, { code: 'identity.unavailable', message: 'The sign-in service is unavailable.' })));
  const { router, user } = renderApp('/');
  expect(await screen.findByRole('heading', { level: 1, name: 'Cannot reach the server' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('The sign-in service is unavailable.');
  mockServer.resetHandlers();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(`/tree/${String(darwinFamily().homePersonId)}`);
  });
});
