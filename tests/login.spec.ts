import { attachHealingSummary } from '../core/healing-reporter';
import { failIfDemoDashboardMetrics } from './demo-dashboard-failures';
import { expect, test } from './fixtures';

test.describe('Retail login (self-healing)', () => {
  test('login page loads with healing visibility check', async ({ loginPage: login }, testInfo) => {
    await login.goto();
    const loaded = await login.expectLoaded();
    await attachHealingSummary(testInfo, 'page-loaded', loaded);
    expect(loaded.usedStrategy).toBeTruthy();
    failIfDemoDashboardMetrics();
  });

  test('customer demo login succeeds', async ({ page, loginPage: login }, testInfo) => {
    await login.goto();
    await login.expectLoaded();

    const { email, password, submit } = await login.loginAsCustomer();
    await attachHealingSummary(testInfo, 'email', email);
    await attachHealingSummary(testInfo, 'password', password);
    await attachHealingSummary(testInfo, 'submit', submit);

    await expect(page).not.toHaveURL(/\/login\/?$/);
  });
});
