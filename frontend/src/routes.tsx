import type { RouteObject } from 'react-router';
import { LoadingState } from './design/components';
import { AppLayout } from './features/shell/AppLayout';
import { NotFoundPage } from './features/shell/NotFoundPage';
import { RouteErrorPage } from './features/shell/RouteErrorPage';

export function createAppRoutes(): RouteObject[] {
  return [
    {
      Component: AppLayout,
      children: [
        {
          ErrorBoundary: RouteErrorPage,
          HydrateFallback: LoadingState,
          children: [
            { index: true, lazy: { Component: async () => (await import('./features/home/HomePage')).HomePage } },
            { path: 'tree/:personId', lazy: { Component: async () => (await import('./features/chart/ChartPage')).ChartPage } },
            { path: 'people', lazy: { Component: async () => (await import('./features/people/PeopleListPage')).PeopleListPage } },
            { path: 'people/new', lazy: { Component: async () => (await import('./features/person-form/NewPersonPage')).NewPersonPage } },
            { path: 'people/:personId', lazy: { Component: async () => (await import('./features/person/PersonProfilePage')).PersonProfilePage } },
            { path: 'people/:personId/edit', lazy: { Component: async () => (await import('./features/person-form/EditPersonPage')).EditPersonPage } },
            { path: 'transfer', lazy: { Component: async () => (await import('./features/transfer/TransferPage')).TransferPage } },
            { path: '*', Component: NotFoundPage },
          ],
        },
      ],
    },
  ];
}
