import type { Page } from '@playwright/test';
import { attachLiveAutoHealProof } from '../core/healing-reporter';
import { clickHealing } from '../core/self-healing';
import { expect, test } from './fixtures';
import {
  DEMO_PAUSE_MS,
  demoHealingToast,
  formatHealedLocator,
  hideHealingModeIndicator,
  miss,
  showHealingModeIndicator,
} from './demo-toast-helpers';

const demoAutoHeal = {
  enabled: true as const,
  discoverOnly: true as const,
  minConfidence: 70,
};

async function ensureCustomerOnProductsPage(page: Page): Promise<void> {
  await page.goto('/app/products', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (/\/login/i.test(page.url())) {
    throw new Error(`Not authenticated — redirected to login (${page.url()}). Check demo credentials.`);
  }
  await expect(
    page.getByRole('heading', { name: /^(Products|Catalog)$/i }).or(page.getByText('Storefront').first())
  ).toBeVisible({ timeout: 30_000 });
}

test.describe('Auto-heal discovery showcase (Nova Retail)', () => {
  test.beforeAll(() => {
    delete process.env.AUTO_HEAL_PERSIST;
    delete process.env.AUTO_HEAL_DISCOVER;
  });

  test('add-to-cart — auto-heal discovery + on-screen toasts @auto-heal-discovery-showcase', async (
    { page, loginPage: login, retailJourney: journey },
    testInfo
  ) => {
    testInfo.setTimeout(180_000);

    // Phase 1 — silent login (no demo toasts on login screen).
    await login.goto();
    await login.expectLoaded();
    await Promise.all([
      page.waitForURL((url) => !/\/login\/?$/.test(url.pathname), { timeout: 60_000 }),
      login.loginAsCustomer(),
    ]);
    await ensureCustomerOnProductsPage(page);
    await journey.expectProductsReady();

    // Phase 2 — visible demo only on Products page (what the video should show).
    await showHealingModeIndicator(page, 'dynamic');
    await demoHealingToast(
      page,
      'dynamic',
      'On Products page — demo starting',
      `Current URL: ${page.url()}\n\nYou should see the product catalog on screen.\nNext: we intentionally use a broken Add to cart locator, then auto-heal discovers the real button.`,
      'info'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    const brokenLocator = 'button[data-demo-miss-add="1"]';
    await demoHealingToast(
      page,
      'dynamic',
      'About to run broken locator',
      `Broken locator: ${brokenLocator}\nWatch the product card — the framework will discover and click the real Add to cart button.`,
      'warn',
      10_000
    );
    await page.waitForTimeout(2_000);

    const addToCart = await clickHealing(page, [miss('add-to-cart-miss-demo', brokenLocator)], {
      actionType: 'click',
      autoHeal: demoAutoHeal,
      timeoutPerStrategyMs: 8_000,
    });

    const failedAttempts = addToCart.attempts.filter((a) => !a.ok).length;
    const selected = addToCart.autoHeal?.selectedCandidate;
    const picked = selected ? `${selected.strategyName} (score=${selected.score})` : addToCart.usedStrategy;
    const healedLocator = formatHealedLocator(selected?.query, addToCart.usedStrategy);

    await demoHealingToast(
      page,
      'dynamic',
      'Broken step → auto-discovery',
      `Broken locator: ${brokenLocator}\nFailed attempts: ${failedAttempts}\n\nThe click still succeeded using dynamic healing.`,
      'warn'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    await demoHealingToast(
      page,
      'dynamic',
      'Healing details',
      `Auto-heal selected: ${picked}\nHealed locator: ${healedLocator}\nPage: ${page.url()}`,
      'ok'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    await journey.gotoCart();
    await expect(page).toHaveURL(/\/app\/cart/, { timeout: 25_000 });

    await attachLiveAutoHealProof(testInfo, [{ title: 'add-to-cart', result: addToCart }]);
    await hideHealingModeIndicator(page);
  });
});
