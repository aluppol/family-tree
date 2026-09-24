import { expect, test } from 'vitest';
import { ApiError } from './api/client';
import { createQueryClient } from './queryClient';

function apiError(status: number): ApiError {
  return new ApiError(status, { code: 'test', message: 'Test failure.', fields: {} });
}

function shouldRetry(failureCount: number, error: Error): boolean {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  return typeof retry === 'function' ? retry(failureCount, error) : false;
}

test.each<{ situation: string; failureCount: number; error: Error; isRetried: boolean }>([
  { situation: 'an unreachable server is retried', failureCount: 0, error: apiError(0), isRetried: true },
  { situation: 'a failing server is retried once more', failureCount: 1, error: apiError(503), isRetried: true },
  { situation: 'retries stop after two attempts', failureCount: 2, error: apiError(502), isRetried: false },
  { situation: 'a missing resource is not retried', failureCount: 0, error: apiError(404), isRetried: false },
  { situation: 'an ended session is not retried', failureCount: 0, error: apiError(401), isRetried: false },
  { situation: 'an unexpected failure is retried', failureCount: 0, error: new TypeError('Failed to fetch'), isRetried: true },
])('$situation', ({ failureCount, error, isRetried }) => {
  expect(shouldRetry(failureCount, error)).toBe(isRetried);
});

test('mutations are never retried and data stays fresh for half a minute', () => {
  const defaults = createQueryClient().getDefaultOptions();
  expect(defaults.mutations?.retry).toBe(false);
  expect(defaults.queries?.staleTime).toBe(30_000);
});
