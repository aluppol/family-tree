import type { ApiErrorBody } from './types';

type ErrorDetail = ApiErrorBody['error'];

export type QueryParameters = Record<string, string | number | undefined>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]>;

  constructor(status: number, detail: ErrorDetail) {
    super(detail.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = detail.code;
    this.fields = detail.fields;
  }
}

const NETWORK_FAILURE: ErrorDetail = {
  code: 'network.unavailable',
  message: 'Cannot reach the server. Check your connection and try again.',
  fields: {},
};

export function buildUrl(path: string, parameters: QueryParameters = {}): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== '') {
      query.set(name, String(value));
    }
  }
  const search = query.toString();
  return search === '' ? path : `${path}?${search}`;
}

export async function getJson<T>(path: string, parameters: QueryParameters = {}): Promise<T> {
  const response = await send(buildUrl(path, parameters), { method: 'GET' });
  return (await response.json()) as T;
}

export async function getBlob(path: string, parameters: QueryParameters = {}): Promise<Blob> {
  const response = await send(buildUrl(path, parameters), { method: 'GET' });
  return response.blob();
}

export async function sendJson<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<T> {
  const response = await send(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as T;
}

export async function sendForm<T>(path: string, form: FormData): Promise<T> {
  const response = await send(path, { method: 'POST', body: form });
  return (await response.json()) as T;
}

export async function putBinary(path: string, content: Blob): Promise<void> {
  await send(path, { method: 'PUT', headers: { 'Content-Type': content.type }, body: content });
}

export async function deleteResource(path: string): Promise<void> {
  await send(path, { method: 'DELETE' });
}

async function send(url: string, init: RequestInit): Promise<Response> {
  const response = await fetchOrFail(url, { ...init, credentials: 'same-origin' });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetail(response));
  }
  return response;
}

async function fetchOrFail(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  try {
    return await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError(0, NETWORK_FAILURE);
  }
}

async function readErrorDetail(response: Response): Promise<ErrorDetail> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return body.error ?? fallbackDetail(response.status);
  } catch {
    return fallbackDetail(response.status);
  }
}

function fallbackDetail(status: number): ErrorDetail {
  return { code: `http.${String(status)}`, message: `The server answered with status ${String(status)}.`, fields: {} };
}
