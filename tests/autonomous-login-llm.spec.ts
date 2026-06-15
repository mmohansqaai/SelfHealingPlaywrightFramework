import { test, expect } from '@playwright/test';
import { attachAutonomousTrace, enableHealing, runAutonomousTest } from 'ai-healing-sdk';

const LOGIN_GOAL =
  'Log in with test@demo.com / password123 and leave the login page.';

test.describe('Phase 12 autonomous login with LLM planner @autonomous-login-llm', () => {
  test.beforeEach(() => {
    test.skip(process.env.RUN_AUTONOMOUS_LLM !== '1', 'Set RUN_AUTONOMOUS_LLM=1 to run LLM planner E2E');
  });

  test('completes Nova Retail login using LLM planner (mock or real API)', async ({ page }, testInfo) => {
    test.setTimeout(180_000);

    enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });

    const result = await runAutonomousTest(page, {
      goal: LOGIN_GOAL,
      startUrl: '/login',
      maxSteps: 25,
      allowedDomains: ['vercel.app'],
      healOnFailure: true,
      timeoutPerActionMs: 30_000,
      plannerMode: 'llm',
      governance: {
        requireMockPlannerInCi: false,
        maxCostUsdPerRun: 0.5,
      },
    });

    await attachAutonomousTrace(testInfo, result);

    expect(result.planner).toMatch(/llm-autonomous-planner-v1/);
    expect(result.status).toBe('completed');
    expect(result.verification.passed).toBe(true);
    await expect(page).not.toHaveURL(/\/login\/?$/);
  });
});
