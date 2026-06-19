import { test, expect } from '@playwright/test';
import { enableHealing } from 'ai-healing-sdk';
import { attachAutonomousTrace, runAutonomousTest } from 'autonomous-qa-sdk';

const CHECKOUT_GOAL =
  'Log in with test@demo.com / password123, add the first product to cart, and reach checkout.';

test.describe('Phase 9 autonomous checkout @autonomous-checkout', () => {
  test('login, add to cart, and reach checkout from NL goal', async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });

    const result = await runAutonomousTest(page, {
      goal: CHECKOUT_GOAL,
      startUrl: '/login',
      maxSteps: 30,
      maxReplans: 2,
      allowedDomains: ['vercel.app'],
      healOnFailure: true,
      timeoutPerActionMs: 20_000,
    });

    await attachAutonomousTrace(testInfo, result);

    expect(result.status).toBe('completed');
    expect(result.verification.passed).toBe(true);
    expect(result.stepsExecuted).toBeLessThanOrEqual(30);
    expect(result.planner).toBe('mock-autonomous-planner-v2');

    await expect(page).toHaveURL(/\/app\/checkout/);
  });
});
