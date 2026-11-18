import { type Page, expect, test } from '@playwright/test';
import { HOME_PERSON_NAME, deleteEveryoneMatching, deleteOpenProfile, familyTreeOf, openHomeCards, personInTree } from './support/familyTree';
import { watchPageProblems } from './support/pageProblems';

const PARENT_IN_TREE = 'Maria Feodorovna of Denmark';
const PARENT_GIVEN_NAMES = 'Maria Feodorovna';
const HOME_PERSON_BIRTH_YEAR = '1868';
const NEW_GIVEN_NAMES = 'Playwright';
const NEW_SURNAME = `Visitor${String(Date.now())}`;
const NEW_CHILD_GIVEN_NAMES = 'Junior';

test('a visitor explores the demo tree, edits a profile, adds relatives and cleans up', async ({ page }) => {
  const problems = watchPageProblems(page);
  await test.step('the home page opens the time tower on Nicholas II, and the switch opens the cards', () => openHomeCards(page));
  await test.step('a person in the tree opens their profile', () => openProfileFromTree(page));
  await test.step('the profile is edited and saved', () => editAndSaveProfile(page));
  await test.step('a new person gets Nicholas II as a parent', () => createPersonWithHomePersonAsParent(page));
  await test.step('a typed name becomes a new child of the new person', () => addNewChildByName(page));
  await test.step('the new person and the new child are deleted after confirming', () => deleteNewPersonAndChild(page));
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
  await expect(page.getByRole('textbox', { name: 'Given names' })).toHaveValue(PARENT_GIVEN_NAMES);
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
  await dialog.getByRole('combobox', { name: 'Person' }).fill('Nicholas Alexandrovich');
  await dialog.getByRole('option', { name: new RegExp(`^${HOME_PERSON_NAME}.*${HOME_PERSON_BIRTH_YEAR}`) }).click();
  await dialog.getByRole('button', { name: 'Add parent' }).click();
  await expect(dialog).toBeHidden();
  await expect(parents.getByRole('link', { name: HOME_PERSON_NAME })).toBeVisible();
}

async function addNewChildByName(page: Page): Promise<void> {
  const childName = `${NEW_CHILD_GIVEN_NAMES} ${NEW_SURNAME}`;
  const children = page.getByRole('region', { name: 'Children' });
  await children.getByRole('button', { name: 'Add child' }).click();
  const dialog = page.getByRole('dialog', { name: `Add a child of ${NEW_GIVEN_NAMES} ${NEW_SURNAME}` });
  await dialog.getByRole('combobox', { name: 'Person' }).fill(childName);
  const suggestions = dialog.getByRole('listbox', { name: 'Person' }).getByRole('option');
  await expect(suggestions).toHaveCount(1);
  await expect(suggestions).toHaveAccessibleName(`Add “${childName}” as a new person`);
  await suggestions.click();
  await expect(dialog.getByRole('textbox', { name: 'Given names' })).toHaveValue(NEW_CHILD_GIVEN_NAMES);
  await expect(dialog.getByRole('textbox', { name: 'Surname' })).toHaveValue(NEW_SURNAME);
  await dialog.getByRole('button', { name: 'Add child' }).click();
  await expect(dialog).toBeHidden();
  await expect(children.getByRole('link', { name: childName })).toBeVisible();
}

async function deleteNewPersonAndChild(page: Page): Promise<void> {
  await deleteOpenProfile(page);
  await deleteEveryoneMatching(page, NEW_SURNAME);
}
