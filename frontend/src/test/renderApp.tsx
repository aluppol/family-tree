import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { type DataRouter, createMemoryRouter } from 'react-router';
import { App } from '../App';
import { createAppRoutes } from '../routes';

export interface RenderedApp {
  router: DataRouter;
  queryClient: QueryClient;
  user: UserEvent;
}

export function renderApp(path: string): RenderedApp {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] });
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  render(<App router={router} queryClient={queryClient} />);
  return { router, queryClient, user };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
}
