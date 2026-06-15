import type { AutonomousRunResult, AutonomousSuiteKpis, AutonomousSuiteResult } from 'autonomous-agent-contracts';
import { estimateAutonomousRunCostUsd, isCostWithinCap } from './cost-estimator';

export function buildAutonomousSuiteKpis(results: AutonomousRunResult[]): AutonomousSuiteKpis {
  const journeyCount = results.length;
  const completedCount = results.filter((r) => r.status === 'completed').length;
  const failedCount = journeyCount - completedCount;
  const failedJourneyIds = results.filter((r) => r.status !== 'completed').map((r) => r.journeyId ?? 'unknown');
  const totalSteps = results.reduce((sum, r) => sum + r.stepsExecuted, 0);
  const totalReplans = results.reduce((sum, r) => sum + r.replanCount, 0);
  const totalCost = results.reduce((sum, r) => sum + r.governance.estimatedCostUsd, 0);
  const needsHumanReviewCount = results.filter((r) => r.governance.needsHumanReview).length;

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
    'Autonomous Suite KPIs',
    '====================',
    `Journeys: ${kpis.journeyCount}`,
    `Completed: ${kpis.completedCount}`,
    `Failed: ${kpis.failedCount}`,
    `Goal completion rate: ${(kpis.goalCompletionRate * 100).toFixed(1)}%`,
    `Avg steps: ${kpis.avgStepsExecuted.toFixed(1)}`,
    `Avg replans: ${kpis.avgReplans.toFixed(2)}`,
    `Total est. cost (USD): $${kpis.totalEstimatedCostUsd.toFixed(4)}`,
    `Avg est. cost (USD): $${kpis.avgEstimatedCostUsd.toFixed(4)}`,
    `Needs human review: ${kpis.needsHumanReviewCount}`,
    kpis.failedJourneyIds.length ? `Failed IDs: ${kpis.failedJourneyIds.join(', ')}` : 'Failed IDs: (none)',
  ].join('\n');
}
