import type { TextKey } from '../i18n/catalogue';
import { isTextKey, type Translate } from '../i18n/translate';
import { ApiError } from './client';

export type ErrorKind = 'session-ended' | 'forbidden' | 'not-found' | 'unavailable' | 'rejected' | 'unexpected';

export class ClientRejection extends Error {
  override readonly name = 'ClientRejection';
  readonly messageKey: TextKey;

  constructor(messageKey: TextKey) {
    super(messageKey);
    this.messageKey = messageKey;
  }
}

const HTTP_STATUS_CODE = /^http\.\d+$/u;

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

export function errorMessageOf(error: unknown, t: Translate): string {
  if (error instanceof ClientRejection) {
    return t(error.messageKey);
  }
  return error instanceof ApiError ? serverMessageOf(error, t) : t('errors.unexpected');
}

export function isRetryable(error: unknown): boolean {
  const kind = errorKindOf(error);
  return kind === 'unavailable' || kind === 'unexpected';
}

function serverMessageOf(error: ApiError, t: Translate): string {
  if (HTTP_STATUS_CODE.test(error.code)) {
    return t('errors.httpStatus', { status: String(error.status) });
  }
  const key = `errors.${error.code}`;
  return isTextKey(key) ? t(key, { message: error.message }) : error.message;
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
