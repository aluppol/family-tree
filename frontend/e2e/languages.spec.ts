import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { TOWER_TIMEOUT } from './support/familyTree';
import { LANGUAGE_NAMES, type LanguageCode, languageSwitcher, openInLanguage, peopleList } from './support/languages';
import { watchPageProblems } from './support/pageProblems';

const RUSSIAN_DATE = /\d{1,2} (января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря) \d{4}/;

test('the three flags switch the page at once, keep what was typed and the address, and the choice survives a reload', async ({ page }) => {
  const problems = watchPageProblems(page);
  await page.goto('/people');
  await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
  const flags = languageSwitcher(page).getByRole('button');
  expect(await flags.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))).toEqual([...LANGUAGE_NAMES]);
  await expect(flags.first()).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('searchbox', { name: 'Search people' }).fill('Romanov');
  await expect(page).toHaveURL(/\/people\?search=Romanov$/);
  await languageSwitcher(page).getByRole('button', { name: 'Русский' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Люди' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('searchbox', { name: 'Поиск людей' })).toHaveValue('Romanov');
  await expect(page).toHaveURL(/\/people\?search=Romanov$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Люди' })).toBeVisible();
  await expect(languageSwitcher(page).getByRole('button', { name: 'Русский' })).toHaveAttribute('aria-current', 'true');
  await languageSwitcher(page).getByRole('button', { name: 'Српски' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Особе' })).toBeVisible();
  expect(problems.consoleErrors).toEqual([]);
  expect(problems.failedResponses).toEqual([]);
});

test('a language in the address is taken once, remembered and removed from the address', async ({ page }) => {
  await openInLanguage(page, '/', 'sr');
  await page.waitForURL(/\/tower\/\d+$/);
  await expect(page.getByRole('img', { name: /^Временска кула/ })).toBeVisible({ timeout: TOWER_TIMEOUT });
  await expect(page.getByRole('navigation', { name: 'Приказ стабла' }).getByRole('link', { name: 'Картице' })).toBeVisible();
  expect(page.url()).not.toContain('lang=');
  await page.goto('/people');
  await expect(page.getByRole('heading', { level: 1, name: 'Особе' })).toBeVisible();
});

test('Russian dates, counts and relatives read naturally on the people list and a profile', async ({ page }) => {
  await openInLanguage(page, '/people', 'ru');
  await expect(page.getByText(/^Показано: \d+ из \d+ человека?\.$/)).toBeVisible();
  await page.getByRole('searchbox', { name: 'Поиск людей' }).fill('Nicholas Alexandrovich');
  await expect(page.getByText(/^Показано: \d+ из \d+ человека? по запросу «Nicholas Alexandrovich»\.$/)).toBeVisible();
  await peopleList(page, 'ru').getByRole('link', { name: /Nicholas Alexandrovich Romanov/ }).first().click();
  await page.waitForURL(/\/people\/\d+$/);
  const life = page.getByRole('region', { name: 'Жизнь' });
  await expect(life.getByText(RUSSIAN_DATE).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Родители' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить ребёнка' })).toBeVisible();
});

for (const language of ['ru', 'sr'] as const) {
  test(`the main pages have no serious or critical accessibility violations in ${language}`, async ({ page }) => {
    test.setTimeout(150_000);
    for (const open of [openPeople, openNewPerson, openTransfer, openTower, openProfile]) {
      await open(page, language);
      await expectNoSevereViolations(page);
    }
  });
}

async function openPeople(page: Page, language: LanguageCode): Promise<void> {
  await openInLanguage(page, '/people', language);
  await expect(peopleList(page, language)).toBeVisible();
}

async function openNewPerson(page: Page, language: LanguageCode): Promise<void> {
  await openInLanguage(page, '/people/new', language);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function openTransfer(page: Page, language: LanguageCode): Promise<void> {
  await openInLanguage(page, '/transfer', language);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function openTower(page: Page, language: LanguageCode): Promise<void> {
  await openInLanguage(page, '/', language);
  await page.waitForURL(/\/tower\/\d+$/);
  await expect(page.locator('canvas')).toBeVisible({ timeout: TOWER_TIMEOUT });
}

async function openProfile(page: Page, language: LanguageCode): Promise<void> {
  await openPeople(page, language);
  await peopleList(page, language).getByRole('link').first().click();
  await page.waitForURL(/\/people\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function expectNoSevereViolations(page: Page): Promise<void> {
  await expect(page.getByRole('status').filter({ hasText: /…/ })).toHaveCount(0);
  const report = await new AxeBuilder({ page }).analyze();
  const severe = report.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
  expect(severe.map((violation) => `${page.url()} ${violation.id}: ${violation.help} at ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);
}
