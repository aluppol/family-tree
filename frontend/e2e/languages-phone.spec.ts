import { expect, test } from '@playwright/test';
import { TOWER_TIMEOUT } from './support/familyTree';
import { LANGUAGE_NAMES, languageSwitcher, openInLanguage, sidewaysOverflow } from './support/languages';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const PAGES = ['/people', '/people/new', '/transfer'] as const;
const SHOW_DETAILS = { en: 'Show details', ru: 'Подробнее', sr: 'Детаљи' } as const;
const HIDE_DETAILS = { en: 'Hide details', ru: 'Свернуть', sr: 'Сакриј' } as const;

test('on a phone the three flags stay in the header, large enough to tap, and switch the language', async ({ page }) => {
  await page.goto('/people');
  await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  const header = await page.getByRole('banner').boundingBox();
  for (const name of LANGUAGE_NAMES) {
    const flag = languageSwitcher(page).getByRole('button', { name });
    await expect(flag).toBeVisible();
    const box = await flag.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((header?.y ?? 0) + (header?.height ?? 0));
  }
  await languageSwitcher(page).getByRole('button', { name: 'Русский' }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Люди' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Меню' })).toBeVisible();
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});

for (const language of ['en', 'ru', 'sr'] as const) {
  test(`on a phone the pages fit the screen without sideways scrolling in ${language}`, async ({ page }) => {
    test.setTimeout(90_000);
    for (const path of PAGES) {
      await openInLanguage(page, path, language);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await sidewaysOverflow(page), `sideways overflow on ${path} in ${language}`).toBeLessThanOrEqual(0);
    }
    await openInLanguage(page, '/', language);
    await page.waitForURL(/\/tower\/\d+$/);
    await expect(page.locator('canvas')).toBeVisible({ timeout: TOWER_TIMEOUT });
    await page.getByRole('button', { name: new RegExp(SHOW_DETAILS[language]) }).click();
    await expect(page.getByRole('button', { name: new RegExp(HIDE_DETAILS[language]) })).toHaveAttribute('aria-expanded', 'true');
    expect(await sidewaysOverflow(page), `sideways overflow on the tower in ${language}`).toBeLessThanOrEqual(0);
  });
}
