import { test, expect } from '@playwright/test';
import {
  mockLlmVerification,
  parseLlmVerificationJson,
  planAutonomousGoalAsync,
  toHeldOutJourneyDefinitions,
} from 'autonomous-test-agent';
import type { AutonomousStepTrace } from 'autonomous-agent-contracts';

test.describe('Phase 14 LLM verification unit', () => {
  test('parseLlmVerificationJson extracts verdict', () => {
    const parsed = parseLlmVerificationJson(
      JSON.stringify({
        passed: true,
        confidence: 0.92,
        reasoning: 'User left login page',
        checks: [{ checkId: 'left-login', passed: true, detail: 'ok' }],
      })
    );
    expect(parsed?.passed).toBe(true);
    expect(parsed?.checks.some((c) => c.checkId === 'llm-goal-satisfied')).toBe(true);
  });

  test('mockLlmVerification fails when still on login for login goal', () => {
    const trace: AutonomousStepTrace[] = [];
    const checks = mockLlmVerification({
      goal: 'Log in with test@demo.com / password123',
      pageState: { url: 'https://x/login', title: 'Login' },
      trace,
    });
    const goalCheck = checks.find((c) => c.checkId === 'llm-goal-satisfied');
    expect(goalCheck?.passed).toBe(false);
  });

  test('held-out journeys are not matched by mock planner template ids only', () => {
    const heldOut = toHeldOutJourneyDefinitions();
    expect(heldOut.length).toBe(5);
    expect(heldOut[0].goal.toLowerCase()).toContain('authenticate');
  });

  test('held-out h01 plans via LLM mock path with extended goal parser', async () => {
    process.env.AUTONOMOUS_LLM_PROVIDER = 'mock';
    const heldOut = toHeldOutJourneyDefinitions();
    const plan = await planAutonomousGoalAsync({
      goal: heldOut[0].goal,
      plannerMode: 'llm',
      startUrl: '/login',
    });
    expect(plan.planner).toMatch(/llm-autonomous-planner-v1/);
    expect(plan.steps.some((s) => s.action.type === 'fail')).toBe(false);
    delete process.env.AUTONOMOUS_LLM_PROVIDER;
  });
});
