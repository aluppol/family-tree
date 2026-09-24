import { screen, waitFor, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { darwinFamily } from '../../test/fixtures';
import { fakeBackend, setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

setUpMockServer();

const MENU_LINKS = ['Tree', 'People', 'Import & export', 'Sign out'];

function menuLinkNames(): string[] {
  const menu = document.getElementById(screen.getByRole('button', { name: 'Menu' }).getAttribute('aria-controls') ?? '');
  return menu === null ? [] : within(menu).getAllByRole('link').map((link) => link.textContent);
}

test('the header names the app, the viewer and the main sections', async () => {
  renderApp('/people');
  expect(screen.getByRole('link', { name: 'Family Tree' })).toHaveAttribute('href', '/');
  const navigation = screen.getByRole('navigation', { name: 'Main' });
  expect(within(navigation).getByRole('link', { name: 'Tree' })).toHaveAttribute('href', '/');
  expect(within(navigation).getByRole('link', { name: 'People' })).toHaveAttribute('aria-current', 'page');
  expect(within(navigation).getByRole('link', { name: 'Import & export' })).toHaveAttribute('href', '/transfer');
  expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute('href', '/oauth2/sign_out');
  expect(await screen.findByText('Demo Visitor')).toBeInTheDocument();
});

test('the mobile menu discloses the same links as the desktop header', async () => {
  const { user } = renderApp('/people');
  const menuButton = screen.getByRole('button', { name: 'Menu' });
  const linksBeforeOpening = menuLinkNames();
  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await user.click(menuButton);
  expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  expect(menuLinkNames()).toEqual(linksBeforeOpening);
  expect(linksBeforeOpening).toEqual(MENU_LINKS);
});

test('the mobile menu closes after choosing a link', async () => {
  const { user, router } = renderApp('/people');
  const menuButton = screen.getByRole('button', { name: 'Menu' });
  await user.click(menuButton);
  await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Import & export' }));
  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/transfer');
  });
  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
});

test('Escape closes the mobile menu and returns focus to its button', async () => {
  const { user } = renderApp('/people');
  const menuButton = screen.getByRole('button', { name: 'Menu' });
  await user.click(menuButton);
  await user.keyboard('{Escape}');
  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  expect(menuButton).toHaveFocus();
});

test('the sandbox banner appears only in the demo sandbox', async () => {
  renderApp('/people');
  expect(await screen.findByText('Demo sandbox — changes are reset every night.')).toBeInTheDocument();
});

test('a personal workspace has no sandbox banner', async () => {
  fakeBackend.seed({ ...darwinFamily(), isSandbox: false });
  renderApp('/people');
  await screen.findByText('Demo Visitor');
  expect(screen.queryByText('Demo sandbox — changes are reset every night.')).not.toBeInTheDocument();
});

test('a skip link leads to the main content and the footer links to the API and the source', () => {
  renderApp('/transfer');
  expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  const footer = screen.getByRole('contentinfo');
  expect(within(footer).getByRole('link', { name: 'API' })).toHaveAttribute('href', '/api/docs/');
  expect(within(footer).getByRole('link', { name: 'Source code' })).toHaveAttribute('href', 'https://github.com/aluppol/family-tree');
});

test('each page sets the document title', async () => {
  renderApp('/transfer');
  await waitFor(() => {
    expect(document.title).toBe('Import & export · Family Tree');
  });
});

test('an unknown address shows the not found page', async () => {
  renderApp('/no/such/page');
  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  expect(document.title).toBe('Page not found · Family Tree');
});

test('following a link moves focus to the main content of the new page', async () => {
  const { user } = renderApp('/people');
  await screen.findByRole('list', { name: 'People in your tree' });
  await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Import & export' }));
  await waitFor(() => {
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
