import { ApiError } from './client';

export type ErrorKind = 'session-ended' | 'forbidden' | 'not-found' | 'unavailable' | 'rejected' | 'unexpected';

export class ClientRejection extends Error {
  override readonly name = 'ClientRejection';
}

const UNEXPECTED_MESSAGE = 'Something unexpected went wrong. Please try again.';

export function errorKindOf(error: unknown): ErrorKind {
  if (error instanceof ClientRejection) {
    return 'rejected';
  }
  if (!(error instanceof ApiError)) {
    return 'unexpected';
  }
  if (error.status === 0 || error.status >= 500) {
    return 'unavailable';
  }
  return clientErrorKind(error.status);
}

export function errorMessageOf(error: unknown): string {
  return error instanceof ApiError || error instanceof ClientRejection ? error.message : UNEXPECTED_MESSAGE;
}

export function isRetryable(error: unknown): boolean {
  const kind = errorKindOf(error);
  return kind === 'unavailable' || kind === 'unexpected';
}

function clientErrorKind(status: number): ErrorKind {
  switch (status) {
    case 401:
      return 'session-ended';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    default:
      return 'rejected';
  }
}
