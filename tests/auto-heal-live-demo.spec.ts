import { attachLiveAutoHealProof } from '../core/healing-reporter';
import type { LocatorStrategy } from '../core/healing-types';
import { clickHealing, expectVisibleHealing, fillHealing } from '../core/self-healing';
import { expect, test } from './fixtures';
import { CUSTOMER_EMAIL, CUSTOMER_PASSWORD } from './traceability/_helpers';

/**
 * Live Nova Retail demo: enables auto-heal discovery and attaches a single HTML-report
 * artifact named `auto-heal-live-proof` (aggregated steps) for presentations.
 *
 * Decoy-only static strategies force one failure each; the engine then discovers locators
 * from the live DOM (see core/auto-heal-discovery.ts). Persistence is off (discover-only).
 */
const demoAutoHeal = {
  enabled: true as const,
  discoverOnly: true as const,
  minConfidence: 70,
};

function miss(name: string, selector: string): LocatorStrategy {
  return { name, resolve: (p) => p.locator(selector) };
}

test.describe('Auto-heal live demo (Nova Retail)', () => {
  test.beforeAll(() => {
    process.env.AUTO_HEAL_DISCOVER = '1';
    delete process.env.AUTO_HEAL_PERSIST;
  });

  test('customer login — auto-heal discovery + auto-heal-live-proof attachment', async ({ page, loginPage: login }, testInfo) => {
    await login.goto();

    const loaded = await expectVisibleHealing(page, [], {
      actionType: 'visible',
      autoHeal: demoAutoHeal,
    });

    const email = await fillHealing(
      page,
      [miss('email-miss-demo', 'input[data-demo-autohael-miss="1"]')],
      CUSTOMER_EMAIL,
      { actionType: 'fill', autoHeal: demoAutoHeal }
    );

    const password = await fillHealing(
      page,
      [miss('password-miss-demo', 'input[data-demo-password-miss="1"]')],
      CUSTOMER_PASSWORD,
      { actionType: 'fill', autoHeal: demoAutoHeal }
    );

    const submit = await clickHealing(page, [miss('sign-in-submit-miss-demo', 'button[data-demo-submit-miss="1"]')], {
      actionType: 'click',
      autoHeal: demoAutoHeal,
    });

    await expect(page).toHaveURL(/\/app(\/|$)/, { timeout: 25_000 });

    await attachLiveAutoHealProof(testInfo, [
      { title: 'login-heading', result: loaded },
      { title: 'login-email', result: email },
      { title: 'login-password', result: password },
      { title: 'login-submit', result: submit },
    ]);
  });
});
