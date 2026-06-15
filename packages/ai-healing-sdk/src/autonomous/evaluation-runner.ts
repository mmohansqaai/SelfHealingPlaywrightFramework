import type { Page } from '@playwright/test';
import type {
  AutonomousJourneyDefinition,
  AutonomousRunOptions,
  AutonomousRunResult,
} from 'autonomous-agent-contracts';
import { runAutonomousTest } from './run-autonomous-test';

export type AutonomousEvaluationKpis = {
  journeyCount: number;
  completedCount: number;
  failedCount: number;
  goalCompletionRate: number;
  targetRate: number;
  targetMet: boolean;
  avgStepsExecuted: number;
  avgReplans: number;
  totalEstimatedCostUsd: number;
  failedJourneyIds: string[];
};

export type AutonomousEvaluationResult = {
  results: AutonomousRunResult[];
  kpis: AutonomousEvaluationKpis;
};

export type RunAutonomousEvaluationOptions = {
  defaults?: Partial<AutonomousRunOptions>;
  /** Minimum goal completion rate (default 0.7 for LLM, 1.0 for mock). */
  targetCompletionRate?: number;
  stopOnFailure?: boolean;
};

function defaultTargetRate(plannerMode?: 'mock' | 'llm'): number {
  const env = process.env.AUTONOMOUS_EVAL_MIN_COMPLETION_RATE;
  if (env) return Number(env);
  return plannerMode === 'llm' ? 0.7 : 1;
}

/** Phase 13 — run evaluation journey set and compute completion KPIs. */
export async function runAutonomousEvaluation(
  page: Page,
  journeys: AutonomousJourneyDefinition[],
  options: RunAutonomousEvaluationOptions = {}
): Promise<AutonomousEvaluationResult> {
  const plannerMode = options.defaults?.plannerMode ?? (process.env.AUTONOMOUS_PLANNER === 'llm' ? 'llm' : 'mock');
  const targetRate = options.targetCompletionRate ?? defaultTargetRate(plannerMode);
  const results: AutonomousRunResult[] = [];

  for (const journey of journeys) {
    const result = await runAutonomousTest(page, {
      ...options.defaults,
      goal: journey.goal,
      startUrl: journey.startUrl,
      maxSteps: journey.maxSteps ?? options.defaults?.maxSteps,
      timeoutPerActionMs: journey.timeoutPerActionMs ?? options.defaults?.timeoutPerActionMs,
      journeyId: journey.id,
      plannerMode,
      governance: {
        requireMockPlannerInCi: false,
        maxCostUsdPerRun: options.defaults?.governance?.maxCostUsdPerRun ?? 0.5,
        ...options.defaults?.governance,
      },
    });
    results.push(result);

    if (options.stopOnFailure && result.status !== 'completed') {
      break;
    }
  }

  const journeyCount = results.length;
  const completedCount = results.filter((r) => r.status === 'completed').length;
  const failedCount = journeyCount - completedCount;
  const goalCompletionRate = journeyCount === 0 ? 0 : completedCount / journeyCount;
  const totalSteps = results.reduce((n, r) => n + r.stepsExecuted, 0);
  const totalReplans = results.reduce((n, r) => n + r.replanCount, 0);
  const totalCost = results.reduce((n, r) => n + r.governance.estimatedCostUsd, 0);

  return {
    results,
    kpis: {
      journeyCount,
      completedCount,
      failedCount,
      goalCompletionRate,
      targetRate,
      targetMet: goalCompletionRate >= targetRate,
      avgStepsExecuted: journeyCount === 0 ? 0 : totalSteps / journeyCount,
      avgReplans: journeyCount === 0 ? 0 : totalReplans / journeyCount,
      totalEstimatedCostUsd: totalCost,
      failedJourneyIds: results.filter((r) => r.status !== 'completed').map((r) => r.journeyId ?? 'unknown'),
    },
  };
}

export function formatAutonomousEvaluationBody(evalResult: AutonomousEvaluationResult): string {
  const { kpis } = evalResult;
  return [
    'Autonomous Evaluation Report (Phase 13)',
    '=======================================',
    `Journeys run: ${kpis.journeyCount}`,
    `Completed: ${kpis.completedCount}`,
    `Failed: ${kpis.failedCount}`,
    `Goal completion rate: ${(kpis.goalCompletionRate * 100).toFixed(1)}%`,
    `Target: ${(kpis.targetRate * 100).toFixed(0)}% — ${kpis.targetMet ? 'MET' : 'NOT MET'}`,
    `Avg steps: ${kpis.avgStepsExecuted.toFixed(1)}`,
    `Avg replans: ${kpis.avgReplans.toFixed(2)}`,
    `Total est. cost (USD): $${kpis.totalEstimatedCostUsd.toFixed(4)}`,
    kpis.failedJourneyIds.length ? `Failed IDs: ${kpis.failedJourneyIds.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
