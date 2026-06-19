import { test, expect } from '@playwright/test';
import {
  formatPageStateForPrompt,
  planAutonomousGoalAsync,
  redactSecretsInGoalText,
} from 'autonomous-test-agent';

test.describe('Phase 13 page state + redaction unit', () => {
  test('formatPageStateForPrompt lists interactive elements', () => {
    const text = formatPageStateForPrompt({
      url: 'https://example.com/login',
      title: 'Login',
      interactiveElements: [{ tag: 'input', role: 'textbox', label: 'Email', inputType: 'email' }],
    });
    expect(text).toContain('Email');
    expect(text).toContain('/login');
  });

  test('redactSecretsInGoalText masks credentials', () => {
    const redacted = redactSecretsInGoalText('Log in with test@demo.com / password123', {
      customerEmail: 'test@demo.com',
      customerPassword: 'password123',
    });
    expect(redacted).not.toContain('password123');
    expect(redacted).toContain('REDACTED');
  });

  test('planAutonomousGoalAsync includes page state in LLM path', async () => {
    process.env.AUTONOMOUS_LLM_PROVIDER = 'mock';
    const plan = await planAutonomousGoalAsync({
      goal: 'Log in with test@demo.com / password123',
      plannerMode: 'llm',
      startUrl: '/login',
      pageState: {
        url: 'https://x/login',
        title: 'Login',
        interactiveElements: [{ tag: 'button', label: 'Sign in', role: 'button' }],
      },
    });
    expect(plan.planner).toMatch(/llm-autonomous-planner-v1/);
    expect(plan.steps.length).toBeGreaterThan(0);
    delete process.env.AUTONOMOUS_LLM_PROVIDER;
  });
});
