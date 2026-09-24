import { expect, test } from '@playwright/test';

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
