import { test, expect } from '@playwright/test';
import {
  parseLlmPlanJson,
  planAutonomousGoalAsync,
  planAutonomousGoalWithLlm,
  resolveAutonomousLlmProvider,
} from 'autonomous-test-agent';

test.describe('Phase 12 LLM planner unit', () => {
  test('parseLlmPlanJson validates login-shaped plan', () => {
    const json = JSON.stringify({
      reasoning: 'Login flow',
      steps: [
        {
          id: 'fill-email',
          action: { type: 'fill', targetHint: 'email', value: 'a@b.com' },
          reasoning: 'email',
        },
        {
          id: 'complete',
          action: { type: 'complete', message: 'done' },
          reasoning: 'done',
        },
      ],
    });
    const parsed = parseLlmPlanJson(json);
    expect(parsed?.steps.length).toBe(2);
    expect(parsed?.steps[0].action.type).toBe('fill');
  });

  test('parseLlmPlanJson rejects invalid action type', () => {
    const parsed = parseLlmPlanJson(
      JSON.stringify({
        reasoning: 'bad',
        steps: [{ id: 'x', action: { type: 'fly' }, reasoning: 'nope' }],
      })
    );
    expect(parsed).toBeNull();
  });

  test('planAutonomousGoalWithLlm uses mock LLM provider by default', async () => {
    process.env.AUTONOMOUS_LLM_PROVIDER = 'mock';
    const plan = await planAutonomousGoalWithLlm({
      goal: 'Log in with test@demo.com / password123',
      startUrl: '/login',
    });
    expect(plan.planner).toContain('llm-autonomous-planner-v1');
    expect(plan.steps.some((s) => s.action.type === 'fill')).toBe(true);
    expect(plan.steps.some((s) => s.action.type === 'complete')).toBe(true);
    delete process.env.AUTONOMOUS_LLM_PROVIDER;
  });

  test('planAutonomousGoalAsync routes llm mode', async () => {
    process.env.AUTONOMOUS_LLM_PROVIDER = 'mock';
    const plan = await planAutonomousGoalAsync({
      goal: 'Log in with test@demo.com / password123',
      plannerMode: 'llm',
      startUrl: '/login',
    });
    expect(plan.planner).toMatch(/llm-autonomous-planner-v1/);
    delete process.env.AUTONOMOUS_LLM_PROVIDER;
  });

  test('planAutonomousGoalAsync routes mock mode', async () => {
    const plan = await planAutonomousGoalAsync({
      goal: 'Log in with test@demo.com / password123',
      plannerMode: 'mock',
    });
    expect(plan.planner).toBe('mock-autonomous-planner-v2');
  });

  test('resolveAutonomousLlmProvider reads env', () => {
    process.env.AUTONOMOUS_LLM_PROVIDER = 'openai';
    expect(resolveAutonomousLlmProvider()).toBe('openai');
    delete process.env.AUTONOMOUS_LLM_PROVIDER;
  });
});
