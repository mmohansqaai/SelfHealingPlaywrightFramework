import { test, expect } from '@playwright/test';
import {
  buildAutonomousSuiteKpis,
  estimateAutonomousRunCostUsd,
  injectSecretsIntoGoal,
  isCostWithinCap,
  isDomainAllowed,
  resolveAutonomousGovernanceFromEnv,
  generatePlaywrightSpecFromTrace,
  goalUsesSecretPlaceholders,
} from 'ai-healing-sdk';
import type { AutonomousRunResult } from 'autonomous-agent-contracts';

test.describe('Phase 10 governance unit', () => {
  test('injectSecretsIntoGoal replaces placeholders', () => {
    const goal = injectSecretsIntoGoal('Log in with {{CUSTOMER_EMAIL}} / {{CUSTOMER_PASSWORD}}', {
      customerEmail: 'a@b.com',
      customerPassword: 'secret',
    });
    expect(goal).toBe('Log in with a@b.com / secret');
    expect(goalUsesSecretPlaceholders('{{EMAIL}} and {{PASSWORD}}')).toBe(true);
  });

  test('isDomainAllowed respects allowlist', () => {
    expect(isDomainAllowed('retail-website-fawn.vercel.app', ['vercel.app'])).toBe(true);
    expect(isDomainAllowed('evil.example.com', ['vercel.app'])).toBe(false);
  });

  test('resolveAutonomousGovernanceFromEnv merges defaults', () => {
    const gov = resolveAutonomousGovernanceFromEnv({ maxCostUsdPerRun: 0.1 });
    expect(gov.maxCostUsdPerRun).toBe(0.1);
    expect(gov.allowedDomains.length).toBeGreaterThan(0);
  });

  test('estimateAutonomousRunCostUsd scales with steps and replans', () => {
    const mock: Pick<AutonomousRunResult, 'stepsExecuted' | 'replanCount' | 'trace' | 'planner'> = {
      stepsExecuted: 10,
      replanCount: 1,
      planner: 'mock-autonomous-planner-v2',
      trace: [{ healed: true } as AutonomousRunResult['trace'][0]],
    };
    const cost = estimateAutonomousRunCostUsd(mock as AutonomousRunResult);
    expect(cost).toBeGreaterThan(0);
    expect(isCostWithinCap(cost, 1)).toBe(true);
    expect(isCostWithinCap(cost, 0.0001)).toBe(false);
  });

  test('buildAutonomousSuiteKpis computes completion rate', () => {
    const base = (status: 'completed' | 'failed'): AutonomousRunResult =>
      ({
        status,
        journeyId: status,
        stepsExecuted: 5,
        replanCount: 0,
        governance: { estimatedCostUsd: 0.01, needsHumanReview: status === 'failed' },
      }) as AutonomousRunResult;

    const kpis = buildAutonomousSuiteKpis([base('completed'), base('failed')]);
    expect(kpis.goalCompletionRate).toBe(0.5);
    expect(kpis.needsHumanReviewCount).toBe(1);
  });

  test('generatePlaywrightSpecFromTrace emits reviewable spec', () => {
    const result = {
      goal: 'demo',
      planner: 'mock',
      stepsExecuted: 1,
      replanCount: 0,
      trace: [{ ok: true, stepId: 'nav', action: { type: 'navigate', url: '/login' } }],
    } as AutonomousRunResult;
    const spec = generatePlaywrightSpecFromTrace(result, 'demo');
    expect(spec).toContain("@generated-from-autonomous");
    expect(spec).toContain("@phase16-review-required");
    expect(spec).toContain("page.goto('/login')");
  });
});
