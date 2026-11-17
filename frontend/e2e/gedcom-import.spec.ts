import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { TOWER_TIMEOUT, deleteEveryoneMatching, familyTreeOf, personInTree, switchToCards } from './support/familyTree';

const IMPORTED_SURNAME = 'Testerby';
const SMALL_GEDCOM = join(import.meta.dirname, 'fixtures', 'small.ged');

test.afterEach(async ({ page }) => {
  await deleteEveryoneMatching(page, IMPORTED_SURNAME);
});

test('a small GEDCOM file is previewed, imported and shown in the tree', async ({ page }) => {
  await page.goto('/transfer');
  await page.getByLabel('Choose a file').setInputFiles(SMALL_GEDCOM);
  await expect(page.getByText('small.ged is ready to import.')).toBeVisible();
  await expect(page.getByRole('definition').first()).toHaveText('3');
  await page.getByRole('button', { name: 'Import 3 people' }).click();
  await expect(page.getByText('Imported 3 people, 2 parent links and 1 marriage.')).toBeVisible();
  await page.getByRole('link', { name: 'Show the tree' }).click();
  await page.waitForURL(/\/tower\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: `Ada ${IMPORTED_SURNAME}` })).toBeVisible({ timeout: TOWER_TIMEOUT });
  await switchToCards(page);
  const tree = familyTreeOf(page, `Ada ${IMPORTED_SURNAME}`);
  for (const givenName of ['Ada', 'Basil', 'Clara']) {
    await expect(personInTree(tree, `${givenName} ${IMPORTED_SURNAME}`)).toBeVisible();
  }
});
