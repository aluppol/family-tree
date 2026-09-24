import { screen, waitFor, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ClientRejection } from '../../api/errorKind';
import { DARWIN_IDS } from '../../test/fixtures';
import { setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';
import { preparePhoto } from '../photos/preparePhoto';

vi.mock('../photos/preparePhoto', () => ({ preparePhoto: vi.fn() }));

setUpMockServer();

function profileOf(personId: number): string {
  return `/people/${String(personId)}`;
}

test('the profile shows the facts, the biography with its line breaks and the actions', async () => {
  renderApp(profileOf(DARWIN_IDS.charles));
  expect(await screen.findByRole('heading', { level: 1, name: 'Charles Robert Darwin' })).toBeInTheDocument();
  expect(document.title).toBe('Charles Robert Darwin · Family Tree');
  const life = screen.getByRole('region', { name: 'Life' });
  expect(life).toHaveTextContent('SexMale');
  expect(life).toHaveTextContent('Born12 Feb 1809Shrewsbury, Shropshire');
  expect(life).toHaveTextContent('Died19 Apr 1882Downe, Kent');
  expect(within(screen.getByRole('region', { name: 'Biography' })).getByText(/Naturalist/).textContent).toBe('Naturalist.\nAuthor of On the Origin of Species.');
  expect(screen.getByRole('img', { name: 'Charles Robert Darwin' })).toHaveAttribute('src', '/api/people/1/photo/');
  expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/people/1/edit');
  expect(screen.getByRole('link', { name: 'Show in tree' })).toHaveAttribute('href', '/tree/1');
});

test('the profile lists parents, partners and children with links to their profiles', async () => {
  renderApp(profileOf(DARWIN_IDS.charles));
  const parents = await screen.findByRole('region', { name: 'Parents' });
  expect(within(parents).getByRole('link', { name: 'Robert Waring Darwin' })).toHaveAttribute('href', '/people/3');
  expect(within(parents).getByRole('link', { name: 'Susannah Wedgwood' })).toHaveAttribute('href', '/people/4');
  const partners = screen.getByRole('region', { name: 'Partners' });
  expect(partners).toHaveTextContent('Emma Wedgwood1808–1896MarriageMarried 29 Jan 1839, Maer');
  expect(within(screen.getByRole('region', { name: 'Children' })).getByRole('link', { name: 'William Erasmus Darwin' })).toBeInTheDocument();
});

test('the home person is marked and another person can become the home person', async () => {
  const { user } = renderApp(profileOf(DARWIN_IDS.emma));
  await user.click(await screen.findByRole('button', { name: 'Set as home person' }));
  expect(await screen.findByRole('button', { name: 'Home person' })).toHaveAttribute('aria-disabled', 'true');
});

test('deleting asks for confirmation first and then returns to the people list', async () => {
  const { user, router } = renderApp(profileOf(DARWIN_IDS.emma));
  await user.click(await screen.findByRole('button', { name: 'Delete' }));
  const dialog = screen.getByRole('dialog', { name: 'Delete Emma Wedgwood?' });
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete person' }));
  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/people');
  });
  const list = await screen.findByRole('list', { name: 'People in your tree' });
  expect(within(list).getByRole('link', { name: /Charles Robert Darwin/ })).toBeInTheDocument();
  expect(within(list).queryByRole('link', { name: /Emma Wedgwood/ })).not.toBeInTheDocument();
});

test('an unknown person is not found', async () => {
  renderApp('/people/999');
  expect(await screen.findByRole('heading', { level: 1, name: 'Not found' })).toBeInTheDocument();
});

test('a new photo is previewed, saved, and can be removed again', async () => {
  vi.mocked(preparePhoto).mockResolvedValue({ photo: new Blob(['jpeg'], { type: 'image/jpeg' }), previewUrl: 'data:image/jpeg;base64,AAAA' });
  const { user } = renderApp(profileOf(DARWIN_IDS.emma));
  await user.upload(await screen.findByLabelText('Upload photo'), new File(['raw'], 'emma.png', { type: 'image/png' }));
  expect(await screen.findByRole('img', { name: 'Emma Wedgwood (unsaved preview)' })).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
  await user.click(screen.getByRole('button', { name: 'Save photo' }));
  expect(await screen.findByRole('img', { name: 'Emma Wedgwood' })).toHaveAttribute('src', '/api/people/2/photo/?revision=1');
  await user.click(screen.getByRole('button', { name: 'Remove photo' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Remove photo?' })).getByRole('button', { name: 'Remove photo' }));
  expect(await screen.findByLabelText('Upload photo')).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Emma Wedgwood' })).not.toBeInTheDocument();
});

test('a file that is not a readable photo is explained and the preview can be discarded', async () => {
  vi.mocked(preparePhoto).mockRejectedValueOnce(new ClientRejection('This file is not a photo we can read.'));
  vi.mocked(preparePhoto).mockResolvedValueOnce({ photo: new Blob(['jpeg']), previewUrl: 'data:image/jpeg;base64,BBBB' });
  const { user } = renderApp(profileOf(DARWIN_IDS.emma));
  const fileInput = await screen.findByLabelText('Upload photo');
  await user.upload(fileInput, new File(['not really a jpeg'], 'broken.jpg', { type: 'image/jpeg' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('This file is not a photo we can read.');
  await user.upload(fileInput, new File(['raw'], 'emma.jpg', { type: 'image/jpeg' }));
  await user.click(await screen.findByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('img', { name: /unsaved preview/ })).not.toBeInTheDocument();
});
