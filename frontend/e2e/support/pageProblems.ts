import type { Page } from '@playwright/test';

export interface PageProblems {
  consoleErrors: string[];
  failedResponses: string[];
}

export function watchPageProblems(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], failedResponses: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    problems.consoleErrors.push(error.message);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.failedResponses.push(`${String(response.status())} ${response.request().method()} ${response.url()}`);
    }
  });
  return problems;
}
