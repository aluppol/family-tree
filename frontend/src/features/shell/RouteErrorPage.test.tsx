import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { expect, test, vi } from 'vitest';
import { RouteErrorPage } from './RouteErrorPage';

function BrokenPage(): never {
  throw new Error('The page module failed to load.');
}

test('an error while showing a page is caught and can be retried by reloading', async () => {
  vi.spyOn(console, 'error').mockImplementation(vi.fn());
  const router = createMemoryRouter([{ path: '/', Component: BrokenPage, ErrorBoundary: RouteErrorPage }]);
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Something unexpected went wrong. Please try again.');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(document.title).toBe('Something went wrong · Family Tree');
});
