import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'https://retail-website-fawn.vercel.app';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  testIgnore: [
    ...(process.env.RUN_TRACEABILITY === '1' ? [] : ['**/traceability/**']),
    ...(process.env.RUN_UNIT_TESTS === '1' ? [] : ['**/*.unit.spec.ts']),
    ...(process.env.RUN_AUTONOMOUS_CI === '1' ? [] : ['**/autonomous-ci-smoke.spec.ts']),
    ...(process.env.RUN_AUTONOMOUS_LLM === '1' ? [] : ['**/autonomous-login-llm.spec.ts']),
    ...(process.env.RUN_AUTONOMOUS_EVAL === '1' ? [] : ['**/autonomous-evaluation.spec.ts']),
    ...(process.env.RUN_AUTONOMOUS_HELD_OUT === '1' ? [] : ['**/autonomous-held-out.spec.ts']),
  ],
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
    ...(process.env.PW_USE_SYSTEM_CHROME === '1' ? { channel: 'chrome' as const } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
