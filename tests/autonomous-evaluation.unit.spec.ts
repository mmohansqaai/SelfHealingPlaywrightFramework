import { test, expect } from '@playwright/test';
import { NOVA_RETAIL_EVALUATION_JOURNEYS, planAutonomousGoal, replanAfterAssertionFailure } from 'autonomous-test-agent';

test.describe('Nova Retail evaluation journeys (plan coverage)', () => {
  for (const journey of NOVA_RETAIL_EVALUATION_JOURNEYS) {
    test(`${journey.id} produces valid plan`, () => {
      const plan = planAutonomousGoal({ goal: journey.goal, startUrl: journey.startUrl });

      expect(plan.planner).toBe(journey.expectPlanner);
      expect(plan.steps.length).toBeGreaterThanOrEqual(journey.minSteps);
      expect(plan.steps.some((s) => s.action.type === 'complete')).toBe(true);
      expect(plan.steps.some((s) => s.action.type === 'fail')).toBe(false);
    });
  }
});

test.describe('replan after assertion failure', () => {
  test('suggests checkout retry when stuck on cart', () => {
    const steps = replanAfterAssertionFailure({
      goal: 'reach checkout',
      failedStepId: 'verify-checkout-url',
      failedAction: { type: 'assert_url', mustMatch: '/checkout' },
      pageUrl: 'https://example.com/app/cart',
      completedStepIds: ['navigate-cart'],
    });

    expect(steps.length).toBeGreaterThan(0);
    expect(steps.some((s) => s.action.type === 'click')).toBe(true);
  });
});
