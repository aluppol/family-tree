import './design/global.scss';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { App } from './App';
import { adoptLanguageFromAddress } from './i18n/languageMemory';
import { createQueryClient } from './queryClient';
import { createAppRoutes } from './routes';

const rootElement = document.getElementById('root');

if (rootElement !== null) {
  adoptLanguageFromAddress();
  createRoot(rootElement).render(
    <StrictMode>
      <App router={createBrowserRouter(createAppRoutes())} queryClient={createQueryClient()} />
    </StrictMode>,
  );
}
