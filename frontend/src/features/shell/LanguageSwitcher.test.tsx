import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../../i18n/languageMemory';
import { setUpMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';
import { LanguageFlag } from './LanguageFlag';
import { LanguageSwitcher } from './LanguageSwitcher';

setUpMockServer();

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'en';
});

function languageButtons(): HTMLElement[] {
  return within(screen.getByRole('group', { name: /^(Language|Язык|Језик)$/ })).getAllByRole('button');
}

test('the header shows three flags, English first and chosen on a first visit', async () => {
  renderApp('/people');
  expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument();
  const buttons = languageButtons();
  expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['English', 'Русский', 'Српски']);
  expect(buttons.map((button) => button.getAttribute('title'))).toEqual(['English', 'Русский', 'Српски']);
  expect(buttons.map((button) => button.getAttribute('lang'))).toEqual(['en', 'ru', 'sr']);
  expect(buttons.map((button) => button.getAttribute('aria-current'))).toEqual(['true', null, null]);
  expect(document.documentElement.lang).toBe('en');
  expect(screen.getByRole('group', { name: 'Language' }).parentElement).not.toHaveAttribute('id', 'site-menu');
});

test('one click switches the whole page to Russian on the same address and remembers it', async () => {
  const { user, router } = renderApp('/people');
  expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Русский' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Люди' })).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('link', { name: 'Импорт и экспорт' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Русский' })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: 'English' })).not.toHaveAttribute('aria-current');
  expect(router.state.location.pathname).toBe('/people');
  expect(document.documentElement.lang).toBe('ru');
  await waitFor(() => {
    expect(document.title).toBe('Люди · Семейное древо');
  });
  expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ru');
});

test('switching keeps what was typed into a form', async () => {
  const { user, router } = renderApp('/people/new');
  const givenNames = await screen.findByRole('textbox', { name: 'Given names' });
  await user.type(givenNames, 'Ljubica');
  await user.click(screen.getByRole('button', { name: 'Српски' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Нова особа' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Име' })).toHaveValue('Ljubica');
  expect(router.state.location.pathname).toBe('/people/new');
});

test('a client-side form message follows the language after a failed submit', async () => {
  const { user } = renderApp('/people/new');
  await user.click(await screen.findByRole('button', { name: 'Add person' }));
  expect(screen.getByText('Enter a given name or a surname.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Русский' }));
  expect(screen.getByText('Укажите имя или фамилию.')).toBeInTheDocument();
});

test('the chosen language is used again after a reload', async () => {
  const first = renderApp('/people');
  await first.user.click(await screen.findByRole('button', { name: 'Српски' }));
  cleanup();
  renderApp('/people');
  expect(await screen.findByRole('heading', { level: 1, name: 'Особе' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Српски' })).toHaveAttribute('aria-current', 'true');
  expect(document.documentElement.lang).toBe('sr');
});

describe('without the app around it', () => {
  test('the switcher shows English and its buttons do nothing', async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('button', { name: 'Русский' }));
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-current', 'true');
  });
});

describe('the flags', () => {
  test('the United States flag has 13 stripes and 50 stars on a blue canton', () => {
    const { container } = render(<LanguageFlag language="en" />);
    const [redStripes, stars] = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d') ?? '');
    expect(redStripes?.match(/M/g)).toHaveLength(7);
    expect(stars?.match(/M/g)).toHaveLength(50);
    expect([...container.querySelectorAll('rect')].map((rect) => rect.getAttribute('fill'))).toEqual(['#ffffff', '#3c3b6e']);
  });

  test('the Russian flag is white, blue and red from the top', () => {
    const { container } = render(<LanguageFlag language="ru" />);
    expect([...container.querySelectorAll('rect')].map((rect) => [rect.getAttribute('y'), rect.getAttribute('fill')])).toEqual([
      [null, '#ffffff'],
      [String(20 / 3), '#0039a6'],
      [String(40 / 3), '#d52b1e'],
    ]);
  });

  test('the Serbian flag is red, blue and white with the crowned coat of arms towards the hoist', () => {
    const { container } = render(<LanguageFlag language="sr" />);
    expect([...container.querySelectorAll('rect')].map((rect) => rect.getAttribute('fill'))).toEqual(['#c6363c', '#0c4076', '#ffffff']);
    const arms = container.querySelector('g');
    expect(arms?.getAttribute('transform')).toMatch(/^translate\(10\.714/);
    expect([...(arms?.querySelectorAll('path') ?? [])].map((path) => path.getAttribute('fill'))).toEqual(['#edb92e', '#c6363c', '#ffffff']);
  });

  test('every flag is decoration for its labelled button', () => {
    const { container } = render(<LanguageFlag language="sr" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
