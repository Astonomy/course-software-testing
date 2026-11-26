import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'REQ-*.spec.ts',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
