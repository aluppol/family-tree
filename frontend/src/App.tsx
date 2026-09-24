import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { type DataRouter, RouterProvider } from 'react-router';

export interface AppProps {
  router: DataRouter;
  queryClient: QueryClient;
}

export function App({ router, queryClient }: AppProps): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
