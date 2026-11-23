import { type Locator, type Page, expect } from '@playwright/test';

export type LanguageCode = 'en' | 'ru' | 'sr';

export const LANGUAGE_NAMES = ['English', 'Русский', 'Српски'] as const;

const PEOPLE_LIST_NAMES: Record<LanguageCode, string> = { en: 'People in your tree', ru: 'Люди в вашем древе', sr: 'Особе у вашем стаблу' };

export function peopleList(page: Page, language: LanguageCode): Locator {
  return page.getByRole('list', { name: PEOPLE_LIST_NAMES[language] });
}

export function languageSwitcher(page: Page): Locator {
  return page.getByRole('group', { name: /^(Language|Язык|Језик)$/ });
}

export async function openInLanguage(page: Page, path: string, language: LanguageCode): Promise<void> {
  const separator = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${separator}lang=${language}`);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

export async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
