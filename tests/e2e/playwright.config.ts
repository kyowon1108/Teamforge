import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scenarios',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_WEB_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'api', testMatch: /\d{2}-.*\.spec\.ts/ },
  ],
});
