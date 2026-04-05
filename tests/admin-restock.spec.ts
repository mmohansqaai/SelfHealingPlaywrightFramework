import { attachHealingSummary } from '../core/healing-reporter';
import { expect, test } from './fixtures';

test.describe('Admin inventory (self-healing)', () => {
  test('admin logs in and increases each product stock by 50', async ({ page, loginPage: login, adminInventory: admin }, testInfo) => {
    test.setTimeout(120_000);

    await login.goto();
    await login.expectLoaded();

    const { email, password, submit } = await login.loginAsAdmin();
    await attachHealingSummary(testInfo, 'admin-email', email);
    await attachHealingSummary(testInfo, 'admin-password', password);
    await attachHealingSummary(testInfo, 'admin-submit', submit);

    await page.waitForURL(/\/app(\/|$)/, { timeout: 25_000 });

    await admin.goto();
    const loaded = await admin.expectLoaded();
    await attachHealingSummary(testInfo, 'admin-operations', loaded);

    await admin.seedOneProductIfCatalogEmpty();

    const { rowCount, stockFills, saveClicks } = await admin.increaseEachProductStockBy(50);

    expect(rowCount).toBeGreaterThan(0);
    expect(stockFills.length).toBe(rowCount);
    expect(saveClicks.length).toBe(rowCount);

    for (let i = 0; i < rowCount; i++) {
      await attachHealingSummary(testInfo, `stock-fill-${i}`, stockFills[i]!);
      await attachHealingSummary(testInfo, `save-${i}`, saveClicks[i]!);
    }

    expect(saveClicks[rowCount - 1]!.usedStrategy).toBeTruthy();
  });
});
