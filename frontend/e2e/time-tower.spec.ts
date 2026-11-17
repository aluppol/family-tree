import { type Locator, type Page, expect, test } from '@playwright/test';
import { HOME_PERSON_NAME, openHomeTower, switchToCards } from './support/familyTree';
import { watchPageProblems } from './support/pageProblems';

const SPOUSE_NAME = 'Emma Wedgwood';
const SON_NAME = 'William Erasmus Darwin';
const KEY_NOTE = 'Height is the year of birth; rings mark decades, the oldest at the bottom.';

test('the time tower draws the family in 3D, finds people and keeps the person across views', async ({ page }) => {
  const problems = watchPageProblems(page);
  await test.step('the home page opens the time tower on Charles Darwin', () => openHomeTower(page));
  await test.step('the selected person shows their relatives', () => expectRelatives(page));
  await test.step('the details panel and the key slide away and come back', () => hideAndShowSides(page));
  await test.step('the search flies to the spouse and Back returns', () => searchAndReturn(page));
  await test.step('the relationship path to the son is listed', () => showRelationshipToSon(page));
  await test.step('the switch opens the cards on the same person', () => switchToCards(page));
  await expect(page.getByRole('heading', { level: 1, name: HOME_PERSON_NAME })).toBeVisible();
  expect(problems.consoleErrors).toEqual([]);
  expect(problems.failedResponses).toEqual([]);
});

async function expectRelatives(page: Page): Promise<void> {
  const panel = page.getByRole('complementary', { name: 'Selected person' });
  await expect(panel.getByRole('heading', { level: 2, name: HOME_PERSON_NAME })).toBeVisible();
  await expect(panel.getByRole('region', { name: 'Spouses' }).getByRole('button', { name: new RegExp(SPOUSE_NAME) })).toBeVisible();
  await expect(panel.getByRole('region', { name: 'Children' }).getByRole('button', { name: new RegExp(SON_NAME) })).toBeVisible();
}

async function hideAndShowSides(page: Page): Promise<void> {
  const stage = page.getByRole('region', { name: 'Time tower' });
  const widthBeside = await widthOf(stage);
  await page.getByRole('button', { name: 'Hide details' }).click();
  await expect(page.getByRole('complementary', { name: 'Selected person' })).toBeHidden();
  await expect.poll(() => widthOf(stage)).toBeGreaterThan(widthBeside + 200);
  await page.getByRole('button', { name: 'Show details' }).click();
  await expect(page.getByRole('complementary', { name: 'Selected person' }).getByRole('heading', { level: 2, name: HOME_PERSON_NAME })).toBeVisible();
  const key = page.getByRole('region', { name: 'Key' });
  await expect(key.getByText(KEY_NOTE)).toBeHidden();
  await key.getByRole('button', { name: 'Key' }).click();
  await expect(key.getByText(KEY_NOTE)).toBeVisible();
  await key.getByRole('button', { name: 'Key' }).click();
  await expect(key.getByText(KEY_NOTE)).toBeHidden();
}

async function widthOf(element: Locator): Promise<number> {
  return (await element.boundingBox())?.width ?? 0;
}

async function searchAndReturn(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('combobox', { name: 'Find a person' }).fill('emma wedg');
  await page.getByRole('option', { name: new RegExp(SPOUSE_NAME) }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: SPOUSE_NAME })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { level: 1, name: HOME_PERSON_NAME })).toBeVisible();
}

async function showRelationshipToSon(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Relationship to…' }).click();
  await page.getByRole('combobox', { name: /^Relationship of/ }).fill('william erasmus');
  await page.getByRole('option', { name: new RegExp(SON_NAME) }).first().click();
  const path = page.getByRole('region', { name: `How ${HOME_PERSON_NAME} is related to ${SON_NAME}` });
  await expect(path.getByRole('button', { name: /^Son/ })).toBeVisible();
}
