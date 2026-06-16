import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AutonomousDashboardKpiDocument, AutonomousRunResult, AutonomousSuiteKpis, AutonomousSuiteResult } from 'autonomous-agent-contracts';
import { estimateAutonomousRunCostUsd, isCostWithinCap } from './cost-estimator';

function countHealedSteps(results: AutonomousRunResult[]): { healedStepsCount: number; totalTraceSteps: number } {
  let healedStepsCount = 0;
  let totalTraceSteps = 0;
  for (const run of results) {
    for (const step of run.trace ?? []) {
      if (step.action.type === 'complete' || step.action.type === 'fail') continue;
      totalTraceSteps++;
      if (step.healed) healedStepsCount++;
    }
  }
  return { healedStepsCount, totalTraceSteps };
}

export function buildAutonomousSuiteKpis(results: AutonomousRunResult[]): AutonomousSuiteKpis {
  const journeyCount = results.length;
  const completedCount = results.filter((r) => r.status === 'completed').length;
  const failedCount = journeyCount - completedCount;
  const failedJourneyIds = results.filter((r) => r.status !== 'completed').map((r) => r.journeyId ?? 'unknown');
  const totalSteps = results.reduce((sum, r) => sum + r.stepsExecuted, 0);
  const totalReplans = results.reduce((sum, r) => sum + r.replanCount, 0);
  const totalCost = results.reduce((sum, r) => sum + r.governance.estimatedCostUsd, 0);
  const needsHumanReviewCount = results.filter((r) => r.governance.needsHumanReview).length;
  const destructiveActionsBlocked = results.reduce(
    (sum, r) => sum + (r.governance.destructiveActionsBlocked ?? 0),
    0
  );
  const llmPlannerRuns = results.filter((r) => r.governance.plannerModeUsed === 'llm').length;
  const { healedStepsCount, totalTraceSteps } = countHealedSteps(results);

  return {
    journeyCount,
    completedCount,
    failedCount,
    goalCompletionRate: journeyCount === 0 ? 0 : completedCount / journeyCount,
    avgStepsExecuted: journeyCount === 0 ? 0 : totalSteps / journeyCount,
    avgReplans: journeyCount === 0 ? 0 : totalReplans / journeyCount,
    totalEstimatedCostUsd: totalCost,
    avgEstimatedCostUsd: journeyCount === 0 ? 0 : totalCost / journeyCount,
    needsHumanReviewCount,
    failedJourneyIds,
    healRate: totalTraceSteps === 0 ? 0 : healedStepsCount / totalTraceSteps,
    healedStepsCount,
    totalTraceSteps,
    destructiveActionsBlocked,
    llmPlannerRuns,
  };
}

export function buildAutonomousSuiteResult(
  results: AutonomousRunResult[],
  maxSuiteCostUsd: number
): AutonomousSuiteResult {
  const kpis = buildAutonomousSuiteKpis(results);
  return {
    results,
    kpis,
    suiteCostCapExceeded: !isCostWithinCap(kpis.totalEstimatedCostUsd, maxSuiteCostUsd),
  };
}

export function formatAutonomousSuiteKpisBody(kpis: AutonomousSuiteKpis): string {
  return [
    'Autonomous Suite KPIs (Phase 16)',
    '================================',
    `Journeys: ${kpis.journeyCount}`,
    `Completed: ${kpis.completedCount}`,
    `Failed: ${kpis.failedCount}`,
    `Goal completion rate: ${(kpis.goalCompletionRate * 100).toFixed(1)}%`,
    `Avg steps: ${kpis.avgStepsExecuted.toFixed(1)}`,
    `Avg replans: ${kpis.avgReplans.toFixed(2)}`,
    `Heal rate: ${((kpis.healRate ?? 0) * 100).toFixed(1)}% (${kpis.healedStepsCount ?? 0}/${kpis.totalTraceSteps ?? 0} steps)`,
    `LLM planner runs: ${kpis.llmPlannerRuns ?? 0}`,
    `Destructive actions blocked: ${kpis.destructiveActionsBlocked ?? 0}`,
    `Total est. cost (USD): $${kpis.totalEstimatedCostUsd.toFixed(4)}`,
    `Avg est. cost (USD): $${kpis.avgEstimatedCostUsd.toFixed(4)}`,
    `Needs human review: ${kpis.needsHumanReviewCount}`,
    kpis.failedJourneyIds.length ? `Failed IDs: ${kpis.failedJourneyIds.join(', ')}` : 'Failed IDs: (none)',
  ].join('\n');
}

/** Phase 16 — leadership / dashboard KPI document (JSON). */
export function buildAutonomousDashboardKpiDocument(
  suite: AutonomousSuiteResult,
  meta: { suiteName?: string; buildVersion?: string } = {}
): AutonomousDashboardKpiDocument {
  return {
    kind: 'autonomous-kpi-v1',
    generatedAt: new Date().toISOString(),
    suiteName: meta.suiteName ?? process.env.SUITE_NAME ?? 'Autonomous QA',
    buildVersion: meta.buildVersion ?? process.env.GITHUB_SHA ?? process.env.BUILD_VERSION ?? 'local',
    kpis: suite.kpis,
  };
}

export function writeAutonomousDashboardKpiDocument(
  suite: AutonomousSuiteResult,
  outputPath = process.env.AUTONOMOUS_KPI_OUTPUT ?? 'autonomous-review/kpi-summary.json',
  meta?: { suiteName?: string; buildVersion?: string }
): string {
  const doc = buildAutonomousDashboardKpiDocument(suite, meta);
  const abs = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(doc, null, 2), 'utf8');
  return abs;
}
