import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'https://retail-website-fawn.vercel.app';
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
      ]
    : [['list']],
  use: {
    baseURL,
    headless: process.env.HEADED === '1' ? false : true,
    // CI uses bundled Chromium from `playwright install`; local may use system Chrome.
    channel: isCI || process.env.PW_USE_SYSTEM_CHROME === '0' ? undefined : 'chrome',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
