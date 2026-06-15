import type { AutonomousRunResult, AutonomousStepTrace } from 'autonomous-agent-contracts';

const COST_PER_STEP_USD = 0.001;
const COST_PER_REPLAN_USD = 0.01;
const COST_PER_HEAL_USD = 0.005;
const COST_LLM_PLAN_USD = 0.05;

/** Estimate run cost for KPI / cap enforcement (mock planner baseline). */
export function estimateAutonomousRunCostUsd(
  result: Pick<AutonomousRunResult, 'stepsExecuted' | 'replanCount' | 'trace' | 'planner'>
): number {
  const healedSteps = result.trace.filter((t) => t.healed).length;
  const llmPlanCost = result.planner.includes('llm') ? COST_LLM_PLAN_USD : 0;
  return (
    llmPlanCost +
    result.stepsExecuted * COST_PER_STEP_USD +
    result.replanCount * COST_PER_REPLAN_USD +
    healedSteps * COST_PER_HEAL_USD
  );
}

export function estimateTraceStepCostUsd(trace: AutonomousStepTrace[]): number {
  const healed = trace.filter((t) => t.healed).length;
  const replanned = trace.filter((t) => t.replanned).length;
  return trace.length * COST_PER_STEP_USD + replanned * COST_PER_REPLAN_USD + healed * COST_PER_HEAL_USD;
}

export function isCostWithinCap(estimatedUsd: number, capUsd: number): boolean {
  if (!Number.isFinite(capUsd) || capUsd <= 0) return true;
  return estimatedUsd <= capUsd;
}
