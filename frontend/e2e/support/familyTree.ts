import { type Locator, type Page, expect } from '@playwright/test';

export const HOME_PERSON_NAME = 'Charles Robert Darwin';

export async function openHomeTree(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForURL(/\/tree\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: HOME_PERSON_NAME })).toBeVisible();
}

export function familyTreeOf(page: Page, focusName: string): Locator {
  return page.getByRole('group', { name: `Family tree of ${focusName}` });
}

export function personInTree(tree: Locator, name: string): Locator {
  return tree.getByRole('link', { name: new RegExp(`^${name}(,|$)`) });
}

export async function deleteOpenProfile(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete person' }).click();
  await page.waitForURL(/\/people$/);
}

export async function deleteEveryoneMatching(page: Page, search: string): Promise<void> {
  for (let remaining = await countMatches(page, search); remaining > 0; remaining = await countMatches(page, search)) {
    await page.getByRole('list', { name: 'People in your tree' }).getByRole('link').first().click();
    await page.waitForURL(/\/people\/\d+$/);
    await deleteOpenProfile(page);
  }
}

async function countMatches(page: Page, search: string): Promise<number> {
  await page.goto(`/people?search=${encodeURIComponent(search)}`);
  const status = page.getByText(new RegExp(`(Showing \\d+ of (\\d+) people matching “${search}”)|(No one matches “${search}”)`)).first();
  await expect(status).toBeVisible();
  const total = /of (\d+) people/.exec(await status.innerText())?.[1];
  return total === undefined ? 0 : Number(total);
}
