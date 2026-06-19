import { test, expect } from '@playwright/test';
import { enableHealing } from 'ai-healing-sdk';
import {
  attachAutonomousSuiteKpis,
  formatAutonomousEvaluationBody,
  runAutonomousEvaluation,
  toEvaluationJourneyDefinitions,
} from 'autonomous-qa-sdk';

test.describe('Phase 13 Nova Retail evaluation @autonomous-evaluation', () => {
  test.beforeEach(() => {
    test.skip(process.env.RUN_AUTONOMOUS_EVAL !== '1', 'Set RUN_AUTONOMOUS_EVAL=1 to run 10-journey eval');
  });

  test('10-journey eval meets completion target', async ({ page }, testInfo) => {
    test.setTimeout(600_000);

    enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });

    const journeys = toEvaluationJourneyDefinitions();
    const plannerMode = process.env.AUTONOMOUS_PLANNER === 'llm' ? 'llm' : 'mock';

    const evaluation = await runAutonomousEvaluation(page, journeys, {
      defaults: {
        allowedDomains: ['vercel.app'],
        healOnFailure: true,
        plannerMode,
        llmVerification: true,
        maxSteps: 30,
        timeoutPerActionMs: 25_000,
        governance: {
          requireMockPlannerInCi: false,
          maxCostUsdPerRun: 0.5,
          maxCostUsdPerSuite: Number(process.env.AUTONOMOUS_MAX_SUITE_COST_USD ?? 5),
        },
      },
    });

    await testInfo.attach('autonomous-evaluation-report', {
      body: formatAutonomousEvaluationBody(evaluation),
      contentType: 'text/plain',
    });

    await testInfo.attach('autonomous-evaluation-kpis', {
      body: JSON.stringify(evaluation.kpis, null, 2),
      contentType: 'application/json',
    });

    await attachAutonomousSuiteKpis(testInfo, {
      journeyCount: evaluation.kpis.journeyCount,
      completedCount: evaluation.kpis.completedCount,
      failedCount: evaluation.kpis.failedCount,
      goalCompletionRate: evaluation.kpis.goalCompletionRate,
      avgStepsExecuted: evaluation.kpis.avgStepsExecuted,
      avgReplans: evaluation.kpis.avgReplans,
      totalEstimatedCostUsd: evaluation.kpis.totalEstimatedCostUsd,
      avgEstimatedCostUsd:
        evaluation.kpis.journeyCount === 0
          ? 0
          : evaluation.kpis.totalEstimatedCostUsd / evaluation.kpis.journeyCount,
      needsHumanReviewCount: evaluation.results.filter((r) => r.governance.needsHumanReview).length,
      failedJourneyIds: evaluation.kpis.failedJourneyIds,
    });

    expect(evaluation.kpis.journeyCount).toBe(10);
    expect(evaluation.kpis.targetMet).toBe(true);
    expect(evaluation.kpis.goalCompletionRate).toBeGreaterThanOrEqual(evaluation.kpis.targetRate);
  });
});
