import { expect, test } from '@playwright/test';
import { TOWER_TIMEOUT } from './support/familyTree';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('on a phone the navigation sits behind a menu button that opens and closes it', async ({ page }) => {
  await page.goto('/people');
  await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
  const menuButton = page.getByRole('button', { name: 'Menu' });
  const navigation = page.getByRole('navigation', { name: 'Main' });
  await expect(navigation).toBeHidden();
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  for (const linkName of ['Tree', 'People', 'Import & export']) {
    await expect(navigation.getByRole('link', { name: linkName })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Sign out' })).toBeVisible();
  await navigation.getByRole('link', { name: 'Import & export' }).click();
  await page.waitForURL(/\/transfer$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Import & export' })).toBeVisible();
  await expect(navigation).toBeHidden();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
});

test('on a phone the pages fit the screen without sideways scrolling', async ({ page }) => {
  for (const path of ['/people', '/people/new', '/transfer']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `sideways overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test('on a phone the time tower fills the screen and the selected person opens from the bottom sheet', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL(/\/tower\/\d+$/);
  const tower = page.getByRole('img', { name: /^Time tower/ });
  await expect(tower).toBeVisible({ timeout: TOWER_TIMEOUT });
  const towerBox = await tower.boundingBox();
  const viewport = page.viewportSize();
  expect(towerBox?.width).toBe(viewport?.width);
  expect((towerBox?.y ?? 0) + (towerBox?.height ?? 0)).toBeCloseTo(viewport?.height ?? 0, 0);
  for (const name of ['Search', 'Overview', 'Side', 'Top', 'Back', 'All names']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  const sheet = page.getByRole('button', { name: /Show details/ });
  await sheet.click();
  await expect(page.getByRole('button', { name: /Hide details/ })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Children' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
