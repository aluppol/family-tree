import { type Page, expect, test } from '@playwright/test';
import { HOME_PERSON_NAME, deleteOpenProfile, familyTreeOf, openHomeTree, personInTree } from './support/familyTree';
import { watchPageProblems } from './support/pageProblems';

const PARENT_IN_TREE = 'Robert Waring Darwin';
const NEW_GIVEN_NAMES = 'Playwright';
const NEW_SURNAME = `Visitor${String(Date.now())}`;

test('a visitor explores the demo tree, edits a profile, adds a relative and cleans up', async ({ page }) => {
  const problems = watchPageProblems(page);
  await test.step('the home page opens the demo tree on Charles Darwin', () => openHomeTree(page));
  await test.step('a person in the tree opens their profile', () => openProfileFromTree(page));
  await test.step('the profile is edited and saved', () => editAndSaveProfile(page));
  await test.step('a new person gets Charles Darwin as a parent', () => createPersonWithHomePersonAsParent(page));
  await test.step('the new person is deleted after confirming', () => deleteOpenProfile(page));
  await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
  expect(problems.consoleErrors).toEqual([]);
  expect(problems.failedResponses).toEqual([]);
});

async function openProfileFromTree(page: Page): Promise<void> {
  await personInTree(familyTreeOf(page, HOME_PERSON_NAME), PARENT_IN_TREE).click();
  await page.waitForURL(/\/people\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: PARENT_IN_TREE })).toBeVisible();
}

async function editAndSaveProfile(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Edit ${PARENT_IN_TREE}` })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Given names' })).toHaveValue('Robert Waring');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.waitForURL(/\/people\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: PARENT_IN_TREE })).toBeVisible();
}

async function createPersonWithHomePersonAsParent(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'People' }).click();
  await page.getByRole('link', { name: 'Add person' }).click();
  await page.getByRole('textbox', { name: 'Given names' }).fill(NEW_GIVEN_NAMES);
  await page.getByRole('textbox', { name: 'Surname' }).fill(NEW_SURNAME);
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `${NEW_GIVEN_NAMES} ${NEW_SURNAME}` })).toBeVisible();
  const parents = page.getByRole('region', { name: 'Parents' });
  await parents.getByRole('button', { name: 'Add parent' }).click();
  const dialog = page.getByRole('dialog', { name: `Add a parent of ${NEW_GIVEN_NAMES} ${NEW_SURNAME}` });
  await dialog.getByRole('combobox', { name: 'Person' }).fill('Charles Robert');
  await dialog.getByRole('option', { name: new RegExp(`^${HOME_PERSON_NAME}`) }).click();
  await dialog.getByRole('button', { name: 'Add parent' }).click();
  await expect(dialog).toBeHidden();
  await expect(parents.getByRole('link', { name: HOME_PERSON_NAME })).toBeVisible();
}
