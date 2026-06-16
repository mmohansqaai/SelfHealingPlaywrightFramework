import { test, expect } from '@playwright/test';
import {
  enableHealing,
  formatAutonomousEvaluationBody,
  runAutonomousEvaluation,
  toHeldOutJourneyDefinitions,
} from 'ai-healing-sdk';

test.describe('Phase 14 held-out journeys @autonomous-held-out', () => {
  test.beforeEach(() => {
    test.skip(process.env.RUN_AUTONOMOUS_HELD_OUT !== '1', 'Set RUN_AUTONOMOUS_HELD_OUT=1');
    test.skip(
      process.env.AUTONOMOUS_PLANNER !== 'llm',
      'Held-out eval requires AUTONOMOUS_PLANNER=llm'
    );
  });

  test('5 held-out paraphrased goals meet completion target', async ({ page }, testInfo) => {
    test.setTimeout(900_000);

    enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });

    const journeys = toHeldOutJourneyDefinitions();
    const evaluation = await runAutonomousEvaluation(page, journeys, {
      targetCompletionRate: Number(process.env.AUTONOMOUS_HELD_OUT_MIN_RATE ?? 0.6),
      defaults: {
        allowedDomains: ['vercel.app'],
        healOnFailure: true,
        plannerMode: 'llm',
        llmVerification: true,
        maxSteps: 35,
        timeoutPerActionMs: 30_000,
        governance: {
          requireMockPlannerInCi: false,
          maxCostUsdPerRun: 0.6,
          maxCostUsdPerSuite: Number(process.env.AUTONOMOUS_MAX_SUITE_COST_USD ?? 4),
        },
      },
    });

    await testInfo.attach('held-out-evaluation-report', {
      body: formatAutonomousEvaluationBody(evaluation),
      contentType: 'text/plain',
    });

    expect(evaluation.kpis.journeyCount).toBe(5);
    expect(evaluation.kpis.targetMet).toBe(true);
  });
});
