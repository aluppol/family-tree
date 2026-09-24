import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { bridgeJsdomBodiesToNodeFetch } from '../test/jsdomBodyBridge';
import { ApiError, buildUrl, deleteResource, getBlob, getJson, putBinary, sendForm, sendJson } from './client';

const server = setupServer();
let removeBodyBridge = (): void => undefined;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  removeBodyBridge = bridgeJsdomBodiesToNodeFetch();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  removeBodyBridge();
  server.close();
});

test('getJson returns the parsed body and asks for JSON', async () => {
  let acceptHeader: string | null = null;
  server.use(
    http.get('/api/me/', ({ request }) => {
      acceptHeader = request.headers.get('Accept');
      return HttpResponse.json({ username: 'albert' });
    }),
  );
  await expect(getJson('/api/me/')).resolves.toEqual({ username: 'albert' });
  expect(acceptHeader).toBe('application/json');
});

test('getJson sends only the query parameters that have a value', async () => {
  let requestedSearch = '';
  server.use(
    http.get('/api/people/', ({ request }) => {
      requestedSearch = new URL(request.url).search;
      return HttpResponse.json({ count: 0, next_offset: null, results: [] });
    }),
  );
  await getJson('/api/people/', { search: '', offset: 50, limit: undefined });
  expect(requestedSearch).toBe('?offset=50');
});

test('sendJson sends the method, a JSON content type and the serialised body', async () => {
  server.use(
    http.put('/api/parent-links/7/', async ({ request }) =>
      HttpResponse.json({ method: request.method, contentType: request.headers.get('Content-Type'), body: await request.json() }),
    ),
  );
  await expect(sendJson('PUT', '/api/parent-links/7/', { kind: 'adopted' })).resolves.toEqual({
    method: 'PUT',
    contentType: 'application/json',
    body: { kind: 'adopted' },
  });
});

test('an error response with an error body becomes an ApiError carrying its status, code, message and fields', async () => {
  server.use(
    http.post('/api/people/', () =>
      HttpResponse.json(
        { error: { code: 'validation.invalid', message: 'Check the dates.', fields: { 'birth.date': ['Year 12000 is outside 1–9999.'] } } },
        { status: 400 },
      ),
    ),
  );
  const failure = await sendJson('POST', '/api/people/', {}).catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(ApiError);
  expect(failure).toMatchObject({ status: 400, code: 'validation.invalid', message: 'Check the dates.', fields: { 'birth.date': ['Year 12000 is outside 1–9999.'] } });
});

test('an error response without a JSON body becomes an ApiError with a fallback message', async () => {
  server.use(http.get('/api/workspace/', () => new HttpResponse('<h1>Bad gateway</h1>', { status: 502, headers: { 'Content-Type': 'text/html' } })));
  await expect(getJson('/api/workspace/')).rejects.toMatchObject({ status: 502, code: 'http.502', message: 'The server answered with status 502.', fields: {} });
});

test('a JSON error response without an error object falls back to the status message', async () => {
  server.use(http.get('/api/workspace/', () => HttpResponse.json({ detail: 'Nope' }, { status: 500 })));
  await expect(getJson('/api/workspace/')).rejects.toMatchObject({ status: 500, code: 'http.500' });
});

test('a network failure becomes an ApiError with status 0', async () => {
  server.use(http.get('/api/workspace/', () => HttpResponse.error()));
  await expect(getJson('/api/workspace/')).rejects.toMatchObject({ status: 0, code: 'network.unavailable' });
});

test('getBlob returns the response body as a blob', async () => {
  server.use(http.get('/api/people/1/photo/', () => new HttpResponse('jpeg-bytes', { headers: { 'Content-Type': 'image/jpeg' } })));
  const photo = await getBlob('/api/people/1/photo/');
  expect(await photo.text()).toBe('jpeg-bytes');
});

test('putBinary sends the blob with its own content type', async () => {
  let receivedType: string | null = null;
  server.use(
    http.put('/api/people/1/photo/', ({ request }) => {
      receivedType = request.headers.get('Content-Type');
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await putBinary('/api/people/1/photo/', new Blob(['jpeg-bytes'], { type: 'image/jpeg' }));
  expect(receivedType).toBe('image/jpeg');
});

test('sendForm posts multipart form data and parses the JSON answer', async () => {
  server.use(
    http.post('/api/gedcom/preview/', async ({ request }) =>
      HttpResponse.json({ contentType: request.headers.get('Content-Type')?.split(';')[0], body: await request.text() }),
    ),
  );
  const form = new FormData();
  form.append('file', new File(['0 HEAD'], 'family.ged'));
  const answer = await sendForm<{ contentType: string; body: string }>('/api/gedcom/preview/', form);
  expect(answer.contentType).toBe('multipart/form-data');
  expect(answer.body).toContain('name="file"; filename="family.ged"');
  expect(answer.body).toContain('0 HEAD');
});

test('deleteResource resolves on 204 and rejects on 404', async () => {
  server.use(
    http.delete('/api/people/1/', () => new HttpResponse(null, { status: 204 })),
    http.delete('/api/people/2/', () => HttpResponse.json({ error: { code: 'person.not_found', message: 'Gone.', fields: {} } }, { status: 404 })),
  );
  await expect(deleteResource('/api/people/1/')).resolves.toBeUndefined();
  await expect(deleteResource('/api/people/2/')).rejects.toMatchObject({ status: 404, code: 'person.not_found' });
});

test('buildUrl leaves a path without parameters untouched and encodes values', () => {
  expect(buildUrl('/api/people/')).toBe('/api/people/');
  expect(buildUrl('/api/people/', { search: 'Wedgwood & Darwin', limit: 20 })).toBe('/api/people/?search=Wedgwood+%26+Darwin&limit=20');
});
