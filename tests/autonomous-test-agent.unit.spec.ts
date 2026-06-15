import { test, expect } from '@playwright/test';
import {
  parseLoginCredentials,
  isLoginGoal,
  isCheckoutGoal,
  planAutonomousGoal,
} from 'autonomous-test-agent';

test.describe('autonomous-test-agent unit', () => {
  test('parseLoginCredentials extracts email and slash password', () => {
    const creds = parseLoginCredentials('Log in with test@demo.com / password123 and leave the login page.');
    expect(creds).toEqual({ email: 'test@demo.com', password: 'password123' });
  });

  test('parseLoginCredentials strips trailing punctuation after slash password', () => {
    const creds = parseLoginCredentials(
      'Log in with test@demo.com / password123, add the first product to cart, and reach checkout.'
    );
    expect(creds).toEqual({ email: 'test@demo.com', password: 'password123' });
  });

  test('isLoginGoal detects login goals with credentials', () => {
    expect(isLoginGoal('Sign in as test@demo.com / password123')).toBe(true);
    expect(isLoginGoal('Browse the catalog')).toBe(false);
  });

  test('isCheckoutGoal detects cart and checkout goals', () => {
    expect(isCheckoutGoal('add the first product to cart and reach checkout')).toBe(true);
    expect(isCheckoutGoal('Sign in only')).toBe(false);
  });

  test('planAutonomousGoal builds login steps', () => {
    const plan = planAutonomousGoal({
      goal: 'Log in with test@demo.com / password123',
      startUrl: '/login',
    });

    expect(plan.planner).toBe('mock-autonomous-planner-v2');
    expect(plan.steps.some((s) => s.action.type === 'navigate')).toBe(true);
    expect(plan.steps.some((s) => s.action.type === 'fill' && s.id === 'fill-email')).toBe(true);
    expect(plan.steps.some((s) => s.action.type === 'click')).toBe(true);
    expect(plan.steps.some((s) => s.action.type === 'assert_url')).toBe(true);
    expect(plan.steps.some((s) => s.action.type === 'complete')).toBe(true);
  });

  test('planAutonomousGoal builds checkout journey', () => {
    const plan = planAutonomousGoal({
      goal: 'Log in with test@demo.com / password123, add to cart, and reach checkout.',
      startUrl: '/login',
    });

    expect(plan.planner).toBe('mock-autonomous-planner-v2');
    expect(plan.steps.some((s) => s.id === 'click-add-to-cart')).toBe(true);
    expect(plan.steps.some((s) => s.id === 'verify-checkout-url')).toBe(true);
    expect(plan.steps.length).toBeGreaterThanOrEqual(12);
  });
});
