import { QueryClient } from '@tanstack/react-query';
import { isRetryable } from './api/errorKind';

const STALE_AFTER_MILLISECONDS = 30_000;
const MAXIMUM_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_AFTER_MILLISECONDS, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAXIMUM_RETRIES && isRetryable(error);
}
