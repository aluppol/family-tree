import '@testing-library/jest-dom/vitest';
import './domPolyfills';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

configure({ asyncUtilTimeout: 10_000 });

vi.setConfig({ testTimeout: 30_000 });

afterEach(() => {
  cleanup();
});
