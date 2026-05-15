import { attachLiveAutoHealProof } from '../core/healing-reporter';
import { clickHealing, expectVisibleHealing } from '../core/self-healing';
import { expect, test } from './fixtures';
import { loginAsCustomer } from './traceability/_helpers';
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

test.describe('Auto-heal discovery showcase (Nova Retail)', () => {
  test.beforeAll(() => {
    delete process.env.AUTO_HEAL_PERSIST;
    delete process.env.AUTO_HEAL_DISCOVER;
  });

  test('add-to-cart — auto-heal discovery + on-screen toasts @auto-heal-discovery-showcase', async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);
    // Login with static fallbacks only (no global AUTO_HEAL_DISCOVER during setup).
    await loginAsCustomer(page, testInfo);

    await showHealingModeIndicator(page, 'dynamic');
    await demoHealingToast(
      page,
      'dynamic',
      'Setup complete (login used static fallbacks)',
      'Note:\n- Customer login above used predefined static strategies only\n- The showcase step below uses DYNAMIC auto-heal discovery',
      'info',
      14_000
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    await demoHealingToast(
      page,
      'dynamic',
      'Showcase started — auto-heal discovery',
      'How it works:\n- Decoy locator fails first\n- Engine discovers a new locator from live DOM semantics\n\nWhat you will see:\n- Broken locator\n- Healed locator from auto-discovery',
      'info'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    await page.goto('/app/products', { waitUntil: 'domcontentloaded' });
    await expectVisibleHealing(page, [], { actionType: 'visible', autoHeal: demoAutoHeal });

    const brokenLocator = 'button[data-demo-miss-add="1"]';
    const addToCart = await clickHealing(page, [miss('add-to-cart-miss-demo', brokenLocator)], {
      actionType: 'click',
      autoHeal: demoAutoHeal,
      timeoutPerStrategyMs: 6_000,
    });

    const failedAttempts = addToCart.attempts.filter((a) => !a.ok).length;
    await demoHealingToast(
      page,
      'dynamic',
      'Broken test step detected',
      `Observed issue:\n- Add-to-cart locator did not match the current DOM\n- Broken locator: ${brokenLocator}\n- Failed locator attempts: ${failedAttempts}\n\nAction:\n- Triggering DYNAMIC auto-heal discovery from page semantics`,
      'warn'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    const selected = addToCart.autoHeal?.selectedCandidate;
    const picked = selected ? `${selected.strategyName} (score=${selected.score})` : addToCart.usedStrategy;
    const healedLocator = formatHealedLocator(selected?.query, addToCart.usedStrategy);
    await demoHealingToast(
      page,
      'dynamic',
      'Healing details',
      `Recovery result:\n- Auto-heal selected: ${picked}\n- Healed locator: ${healedLocator}\n- Step resumed without manual script changes\n\nEvidence:\n- Attempt history is attached in the report`,
      'ok'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    await page.goto('/app/cart');
    const cartReady = await expectVisibleHealing(page, [], { actionType: 'visible', autoHeal: demoAutoHeal });
    await expect(page).toHaveURL(/\/app\/cart/, { timeout: 25_000 });

    await attachLiveAutoHealProof(testInfo, [
      { title: 'add-to-cart', result: addToCart },
      { title: 'cart-ready', result: cartReady },
    ]);
    await hideHealingModeIndicator(page);
  });
});
