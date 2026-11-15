import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useParams } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ChartPage } from './ChartPage';
import { darwinFamilyChart } from './testing/darwinFamily';
import { familyChart } from './testing/familyScript';

const CHART_PATH = '/api/people/:personId/chart/';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('ChartPage loading', () => {
  it('shows a loading status and then the tree of the person in the address', async () => {
    serveDarwinFamily();
    renderPageAt('/tree/1');
    expect(screen.getByText('Loading the family tree…').closest('[role="status"]')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Charles Robert Darwin' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Family tree of Charles Robert Darwin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/people/1');
    expect(document.title).toBe('Family tree of Charles Robert Darwin · Family Tree');
  });

  it('shows page not found for an address without a person number', () => {
    renderPageAt('/tree/charles');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('ChartPage errors', () => {
  it('says the person was not found when the server answers 404', async () => {
    serveError(404, { code: 'person.not_found', message: 'This person does not exist.' });
    renderPageAt('/tree/404');
    expect(await screen.findByRole('heading', { level: 1, name: 'Not found' })).toBeInTheDocument();
    expect(screen.getByText('This person does not exist.')).toBeInTheDocument();
  });

  it('tells the viewer when their session has ended', async () => {
    serveError(401, { code: 'auth.unauthenticated', message: 'Sign in to continue.' });
    renderPageAt('/tree/1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Your session has ended' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/');
  });

  it('offers to try again when the server cannot be reached', async () => {
    serveDarwinFamily();
    server.use(http.get(CHART_PATH, () => HttpResponse.error(), { once: true }));
    const { user } = renderPageAt('/tree/1');
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Charles Robert Darwin' })).toBeInTheDocument();
  });
});

describe('ChartPage whole tree', () => {
  it('asks for the whole tree and offers no generation choice', async () => {
    const searches = serveDarwinFamily();
    renderPageAt('/tree/1');
    await screen.findByRole('heading', { level: 1, name: 'Charles Robert Darwin' });
    expect(searches).toEqual(['']);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('suggests adding relatives when the person stands alone', async () => {
    server.use(http.get(CHART_PATH, () => HttpResponse.json(familyChart({ focus: 'Ada', people: [['Ada', 'female', 1815]] }))));
    renderPageAt('/tree/1');
    expect(await screen.findByText(/No relatives to show yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add parents or children from the profile page' })).toHaveAttribute('href', '/people/1');
  });
});

describe('ChartPage navigation', () => {
  it('opens the profile of a person picked in the tree', async () => {
    serveDarwinFamily();
    renderPageAt('/tree/1');
    fireEvent.click(await screen.findByRole('link', { name: 'Emma Wedgwood, 1808–1896' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile of person 2' })).toBeInTheDocument();
  });

  it('centres the tree on another person', async () => {
    serveDarwinFamily();
    renderPageAt('/tree/1');
    fireEvent.click(await screen.findByRole('link', { name: 'Centre the tree on Emma Wedgwood' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Emma Wedgwood' })).toBeInTheDocument();
  });
});

function renderPageAt(path: string): { user: ReturnType<typeof userEvent.setup> } {
  const router = createMemoryRouter(
    [
      { path: '/tree/:personId', Component: ChartPage },
      { path: '/people/:personId', Component: ProfileStub },
    ],
    { initialEntries: [path] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
}

function ProfileStub(): ReactElement {
  const { personId = '' } = useParams();
  return <h1>Profile of person {personId}</h1>;
}

function serveDarwinFamily(): string[] {
  const searches: string[] = [];
  server.use(
    http.get(CHART_PATH, ({ request, params }) => {
      searches.push(new URL(request.url).search);
      return HttpResponse.json(darwinFamilyChart(Number(params.personId)));
    }),
  );
  return searches;
}

function serveError(status: number, { code, message }: { code: string; message: string }): void {
  server.use(http.get(CHART_PATH, () => HttpResponse.json({ error: { code, message, fields: {} } }, { status })));
}
