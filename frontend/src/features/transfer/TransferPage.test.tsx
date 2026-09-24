import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { expect, test } from 'vitest';
import { apiErrorResponse } from '../../test/handlers';
import { fakeBackend, mockServer, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

const SMALL_GEDCOM = new File(['0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR\n'], 'small.ged', { type: 'application/octet-stream' });

test('a file is previewed with its counts and skipped records before it is imported', async () => {
  const { user } = renderApp('/transfer');
  await user.upload(await screen.findByLabelText('Choose a file'), SMALL_GEDCOM);
  expect(await screen.findByText('small.ged is ready to import.')).toBeInTheDocument();
  expect(screen.getByText('People', { selector: 'dt' }).nextElementSibling).toHaveTextContent('3');
  expect(screen.getByText('Parent links', { selector: 'dt' }).nextElementSibling).toHaveTextContent('2');
  expect(screen.getByText('1 record will be skipped')).toBeInTheDocument();
  expect(screen.getByText('line 42')).toBeInTheDocument();
  const peopleBefore = fakeBackend.workspace().people_count;
  await user.click(screen.getByRole('button', { name: 'Import 3 people' }));
  expect(await screen.findByText('Imported 3 people, 2 parent links and 1 partnership.')).toBeInTheDocument();
  expect(fakeBackend.workspace().people_count).toBe(peopleBefore + 3);
  expect(screen.getByRole('link', { name: 'Show the tree' })).toHaveAttribute('href', expect.stringMatching(/^\/tree\/\d+$/));
  await user.click(screen.getByRole('button', { name: 'Import another file' }));
  expect(screen.getByLabelText('Choose a file')).toBeInTheDocument();
});

test('an unreadable file is explained and another file can be chosen', async () => {
  mockServer.use(http.post('/api/gedcom/preview/', () => apiErrorResponse(400, { code: 'gedcom.unreadable', message: 'This is not a GEDCOM file.' })));
  const { user } = renderApp('/transfer');
  await user.upload(await screen.findByLabelText('Choose a file'), new File(['hello'], 'notes.ged'));
  expect(await screen.findByRole('alert')).toHaveTextContent('This is not a GEDCOM file.');
  expect(screen.getByLabelText('Choose another file')).toBeInTheDocument();
});

test('a failed import keeps the preview and shows why', async () => {
  mockServer.use(http.post('/api/gedcom/import/', () => apiErrorResponse(400, { code: 'workspace.limit_reached', message: 'Your tree cannot hold more people.' })));
  const { user } = renderApp('/transfer');
  await user.upload(await screen.findByLabelText('Choose a file'), SMALL_GEDCOM);
  await user.click(await screen.findByRole('button', { name: 'Import 3 people' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your tree cannot hold more people.');
  expect(screen.getByText('small.ged is ready to import.')).toBeInTheDocument();
});

test('the tree can be exported in three formats', async () => {
  renderApp('/transfer');
  const exportSection = await screen.findByRole('region', { name: 'Export your tree' });
  expect(within(exportSection).getByRole('link', { name: 'GEDCOM 7.0' })).toHaveAttribute('href', '/api/gedcom/export/?format=gedcom-7.0');
  expect(within(exportSection).getByRole('link', { name: 'GEDCOM 5.5.1' })).toHaveAttribute('href', '/api/gedcom/export/?format=gedcom-5.5.1');
  expect(within(exportSection).getByRole('link', { name: 'GEDZIP' })).toHaveAttribute('href', '/api/gedcom/export/?format=gedzip');
});
