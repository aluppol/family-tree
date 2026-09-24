import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { HOME_PERSON_NAME, openHomeTree } from './support/familyTree';

interface PageUnderTest {
  name: string;
  open: (page: Page) => Promise<void>;
}

const PAGES: PageUnderTest[] = [
  { name: 'the people list', open: (page) => openPage(page, { path: '/people', heading: 'People' }) },
  { name: 'the new person form', open: (page) => openPage(page, { path: '/people/new', heading: 'Add a person' }) },
  { name: 'import and export', open: (page) => openPage(page, { path: '/transfer', heading: 'Import & export' }) },
  { name: 'the tree', open: openHomeTree },
  { name: 'a profile', open: openHomeProfile },
];

for (const pageUnderTest of PAGES) {
  test(`${pageUnderTest.name} has no serious or critical accessibility violations`, async ({ page }) => {
    await pageUnderTest.open(page);
    const axeReport = await new AxeBuilder({ page }).analyze();
    const severeViolations = axeReport.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(severeViolations.map((violation) => `${violation.id}: ${violation.help} at ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

async function openPage(page: Page, { path, heading }: { path: string; heading: string }): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Loading/ })).toHaveCount(0);
}

async function openHomeProfile(page: Page): Promise<void> {
  await openHomeTree(page);
  await page.getByRole('link', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { level: 1, name: HOME_PERSON_NAME })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Children' })).toBeVisible();
}
