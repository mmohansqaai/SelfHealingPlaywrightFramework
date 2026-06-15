import { test, expect } from '@playwright/test';
import {
  attachAutonomousHumanReview,
  attachAutonomousSuiteKpis,
  attachAutonomousTrace,
  AUTONOMOUS_CI_SMOKE_JOURNEYS,
  enableHealing,
  runAutonomousSuite,
  runMaintenanceAgentAsync,
  writeAutonomousReviewArtifact,
} from 'ai-healing-sdk';

test.describe('Phase 10 autonomous CI smoke @autonomous-ci-smoke', () => {
  test('governed suite — login + checkout with env secrets and KPI rollup', async ({ page }, testInfo) => {
    test.setTimeout(180_000);

    enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });

    const suite = await runAutonomousSuite(page, AUTONOMOUS_CI_SMOKE_JOURNEYS, {
      defaults: {
        allowedDomains: ['vercel.app'],
        healOnFailure: true,
        plannerMode: 'mock',
        governance: {
          maxCostUsdPerRun: 0.25,
          maxCostUsdPerSuite: 0.5,
          requireMockPlannerInCi: true,
          humanReviewOnFailure: true,
        },
      },
    });

    await attachAutonomousSuiteKpis(testInfo, suite.kpis);

    for (const result of suite.results) {
      await attachAutonomousTrace(testInfo, result);
      if (result.governance.needsHumanReview) {
        await attachAutonomousHumanReview(testInfo, result);
        writeAutonomousReviewArtifact(result);
      }
      if (process.env.MAINTENANCE_AGENT === '1') {
        const maintenance = await runMaintenanceAgentAsync(result, {
          outputDir: 'maintenance-output',
          publishTicketsLive: process.env.MAINTENANCE_PUBLISH_JIRA === '1',
        });
        if (maintenance.publishResults?.length) {
          await testInfo.attach('maintenance-jira-publish', {
            body: JSON.stringify(maintenance.publishResults, null, 2),
            contentType: 'application/json',
          });
        }
      }
    }

    expect(suite.suiteCostCapExceeded).toBe(false);
    expect(suite.kpis.goalCompletionRate).toBe(1);
    expect(suite.kpis.journeyCount).toBe(2);
    expect(suite.kpis.totalEstimatedCostUsd).toBeLessThanOrEqual(0.5);
    expect(suite.kpis.needsHumanReviewCount).toBe(0);

    await expect(page).toHaveURL(/\/app\/checkout/);
  });
});
