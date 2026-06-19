import { test, expect } from '@playwright/test';
import {
  buildAutonomousDashboardKpiDocument,
  buildAutonomousSuiteKpis,
  destructiveActionBlockedReason,
  generatePlaywrightSpecFromTrace,
  goalExplicitlyAllowsDestructiveActions,
  isDestructiveActionAllowed,
  isDestructiveAutonomousAction,
} from 'autonomous-qa-sdk';
import type { AutonomousRunResult } from 'autonomous-agent-contracts';

test.describe('Phase 16 fully autonomous v1 polish unit', () => {
  test('destructive guard blocks pay click without goal permission', () => {
    expect(isDestructiveAutonomousAction({ type: 'click', targetHint: 'pay place order button checkout' })).toBe(true);
    expect(
      isDestructiveActionAllowed({
        goal: 'Browse products catalog',
        action: { type: 'click', targetHint: 'pay place order button checkout' },
      })
    ).toBe(false);
    expect(destructiveActionBlockedReason({ type: 'click', targetHint: 'pay now' })).toContain('Destructive action blocked');
  });

  test('destructive guard allows pay when goal includes place order', () => {
    expect(goalExplicitlyAllowsDestructiveActions('Complete purchase and place order')).toBe(true);
    expect(
      isDestructiveActionAllowed({
        goal: 'Complete purchase and place order',
        action: { type: 'click', targetHint: 'pay place order button checkout' },
      })
    ).toBe(true);
  });

  test('buildAutonomousSuiteKpis includes heal rate and destructive blocked', () => {
    const run = {
      status: 'completed',
      journeyId: 'j1',
      stepsExecuted: 3,
      replanCount: 0,
      planner: 'mock',
      trace: [
        { ok: true, healed: true, action: { type: 'click', targetHint: 'x' } },
        { ok: true, healed: false, action: { type: 'fill', targetHint: 'y', value: 'z' } },
        { ok: true, action: { type: 'complete', message: 'done' } },
      ],
      governance: { estimatedCostUsd: 0.02, needsHumanReview: false, plannerModeUsed: 'mock', destructiveActionsBlocked: 1 },
    } as AutonomousRunResult;

    const kpis = buildAutonomousSuiteKpis([run]);
    expect(kpis.healRate).toBeGreaterThan(0);
    expect(kpis.destructiveActionsBlocked).toBe(1);
  });

  test('buildAutonomousDashboardKpiDocument uses autonomous-kpi-v1 kind', () => {
    const doc = buildAutonomousDashboardKpiDocument({
      results: [],
      kpis: buildAutonomousSuiteKpis([]),
      suiteCostCapExceeded: false,
    });
    expect(doc.kind).toBe('autonomous-kpi-v1');
    expect(doc.kpis.journeyCount).toBe(0);
  });

  test('generatePlaywrightSpecFromTrace includes phase16 review tag and healing', () => {
    const result = {
      goal: 'login demo',
      planner: 'mock',
      stepsExecuted: 2,
      replanCount: 0,
      trace: [
        {
          ok: true,
          stepId: 'click-sign-in',
          healed: true,
          usedStrategy: 'hint-submit',
          action: { type: 'click', targetHint: 'sign in button submit login' },
        },
      ],
    } as AutonomousRunResult;
    const spec = generatePlaywrightSpecFromTrace(result, 'demo');
    expect(spec).toContain('@phase16-review-required');
    expect(spec).toContain('enableHealing');
    expect(spec).toContain('self-healed');
  });
});
