import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, onTestFinished } from 'vitest';
import { FakeFamilyBackend } from './fakeBackend';
import { type FamilySeed, darwinFamily } from './fixtures';
import { familyHandlers } from './handlers';
import { bridgeJsdomBodiesToNodeFetch } from './jsdomBodyBridge';

export const fakeBackend = new FakeFamilyBackend();

export const mockServer = setupServer(...familyHandlers(fakeBackend));

export function setUpMockServer(seedFamily: () => FamilySeed = darwinFamily): void {
  let removeBodyBridge = (): void => undefined;
  beforeAll(() => {
    mockServer.listen({ onUnhandledRequest: 'error' });
    removeBodyBridge = bridgeJsdomBodiesToNodeFetch();
  });
  beforeEach(() => {
    fakeBackend.seed(seedFamily());
  });
  afterEach(() => {
    mockServer.resetHandlers();
  });
  afterAll(() => {
    removeBodyBridge();
    mockServer.close();
  });
}

export function recordChangeRequests(): string[] {
  const changeRequests: string[] = [];
  function record({ request }: { request: Request }): void {
    if (request.method !== 'GET') {
      changeRequests.push(`${request.method} ${new URL(request.url).pathname}`);
    }
  }
  mockServer.events.on('request:start', record);
  onTestFinished(() => {
    mockServer.events.removeListener('request:start', record);
  });
  return changeRequests;
}
