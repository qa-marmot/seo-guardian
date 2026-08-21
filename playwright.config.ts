import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
      testMatch: '**/*.test.ts',
    },
    {
      name: 'integration',
      testDir: './tests/integration',
      testMatch: '**/*.spec.ts',
    },
  ],
});

