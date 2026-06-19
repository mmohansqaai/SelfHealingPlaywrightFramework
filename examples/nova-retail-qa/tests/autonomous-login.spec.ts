import { test, expect } from '@playwright/test';
import { enableHealing } from 'ai-healing-sdk';
import { attachAutonomousTrace, runAutonomousTest } from 'autonomous-qa-sdk';

const LOGIN_GOAL =
  'Log in with test@demo.com / password123 and leave the login page.';

test.describe('Phase 8 autonomous login @autonomous-login', () => {
  test('completes Nova Retail login from natural language goal', async ({ page }, testInfo) => {
    enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });

    const result = await runAutonomousTest(page, {
      goal: LOGIN_GOAL,
      startUrl: '/login',
      maxSteps: 25,
      allowedDomains: ['vercel.app'],
      healOnFailure: true,
      timeoutPerActionMs: 30_000,
    });

    await attachAutonomousTrace(testInfo, result);

    expect(result.status).toBe('completed');
    expect(result.verification.passed).toBe(true);
    expect(result.stepsExecuted).toBeGreaterThan(0);
    expect(result.stepsExecuted).toBeLessThanOrEqual(25);
    expect(result.trace.length).toBeGreaterThan(0);

    await expect(page).not.toHaveURL(/\/login\/?$/);
  });
});
