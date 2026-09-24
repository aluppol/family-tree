import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import type { ProxyOptions } from 'vite';
import { defineConfig } from 'vitest/config';

const developmentTokenFile = resolve(import.meta.dirname, '../backend/.dev-identity/token');
const backendOrigin = 'http://127.0.0.1:8000';

function readDevelopmentToken(): string | undefined {
  try {
    return readFileSync(developmentTokenFile, 'utf8').trim();
  } catch {
    return undefined;
  }
}

function backendProxy(): ProxyOptions {
  return {
    target: backendOrigin,
    configure: (proxy) => {
      proxy.on('proxyReq', (request) => {
        const token = readDevelopmentToken();
        if (token !== undefined) {
          request.setHeader('X-Forwarded-Access-Token', token);
        }
        request.setHeader('X-Forwarded-Proto', 'https');
      });
    },
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: { '/api': backendProxy() },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
