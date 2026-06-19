import { test, expect } from '@playwright/test';
import { enableHealing } from 'ai-healing-sdk';
import {
  attachAutonomousHumanReview,
  attachAutonomousSuiteKpis,
  attachAutonomousTrace,
  AUTONOMOUS_CI_SMOKE_JOURNEYS,
  writeCiRunContextForJira,
  resolveGithubActionsRunUrl,
  runAutonomousSuite,
  runMaintenanceAgentAsync,
  writeAutonomousDashboardKpiDocument,
  writeAutonomousReviewArtifact,
} from 'autonomous-qa-sdk';
import type { MaintenanceAgentResult } from 'autonomous-agent-contracts';

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

    const kpiPath = writeAutonomousDashboardKpiDocument(suite, 'autonomous-review/kpi-summary.json', {
      suiteName: 'Autonomous CI Smoke',
      buildVersion: process.env.GITHUB_SHA,
    });
    await testInfo.attach('autonomous-kpi-summary', {
      body: JSON.stringify({ kpiPath, kpis: suite.kpis }, null, 2),
      contentType: 'application/json',
    });

    const maintenanceResults: MaintenanceAgentResult[] = [];

    for (const result of suite.results) {
      await attachAutonomousTrace(testInfo, result);
      if (result.governance.needsHumanReview) {
        await attachAutonomousHumanReview(testInfo, result);
        writeAutonomousReviewArtifact(result);
      }
      if (process.env.MAINTENANCE_AGENT === '1') {
        const maintenance = await runMaintenanceAgentAsync(result, {
          outputDir: 'maintenance-output',
          ticketProvider: (process.env.MAINTENANCE_TICKET_PROVIDER as 'jira' | 'mock' | 'linear') ?? 'jira',
          publishTicketsLive: process.env.MAINTENANCE_PUBLISH_JIRA === '1',
        });
        maintenanceResults.push(maintenance);
        if (maintenance.publishResults?.length) {
          await testInfo.attach('maintenance-jira-publish', {
            body: JSON.stringify(maintenance.publishResults, null, 2),
            contentType: 'application/json',
          });
        }
      }
    }

    writeCiRunContextForJira({
      suite,
      maintenanceResults,
      sha: process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
      runUrl: resolveGithubActionsRunUrl(),
      workflowStatus: 'success',
    });

    expect(suite.suiteCostCapExceeded).toBe(false);
    expect(suite.kpis.goalCompletionRate).toBe(1);
    expect(suite.kpis.journeyCount).toBe(2);
    expect(suite.kpis.totalEstimatedCostUsd).toBeLessThanOrEqual(0.5);
    expect(suite.kpis.needsHumanReviewCount).toBe(0);

    await expect(page).toHaveURL(/\/app\/checkout/);
  });
});
