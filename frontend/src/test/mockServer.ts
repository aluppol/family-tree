import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
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
