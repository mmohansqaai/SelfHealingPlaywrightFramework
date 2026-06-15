import type { AutonomousPlanRequest, AutonomousPlannedStep } from 'autonomous-agent-contracts';
import { callAutonomousLlmPlanner } from './llm-planner-client';
import { parseLlmPlanJson } from './parse-llm-plan';
import { replanAfterAssertionFailure, isAssertionAction } from './replan';

function prefixRecoverySteps(steps: AutonomousPlannedStep[]): AutonomousPlannedStep[] {
  return steps.map((s, i) => ({
    ...s,
    id: s.id.startsWith('llm-replan-') ? s.id : `llm-replan-${i + 1}-${s.id}`,
    reasoning: `[LLM recovery] ${s.reasoning}`,
  }));
}

/** Phase 13 — LLM-driven recovery steps after action/assertion failure. */
export async function planLlmRecoverySteps(
  request: AutonomousPlanRequest
): Promise<{ steps: AutonomousPlannedStep[]; reasoning: string; planner: string }> {
  const recovery = request.recoveryContext;
  if (!recovery) {
    return { steps: [], reasoning: 'No recovery context', planner: 'llm-replan-none' };
  }

  if (isAssertionAction(recovery.failedAction)) {
    const ruleSteps = replanAfterAssertionFailure({
      goal: request.goal,
      failedStepId: recovery.failedStepId,
      failedAction: recovery.failedAction,
      pageUrl: request.pageState?.url ?? '',
      completedStepIds: recovery.completedStepIds,
    });
    if (ruleSteps.length > 0) {
      return {
        steps: prefixRecoverySteps(ruleSteps),
        reasoning: 'Rule-based replan for assertion failure (LLM replan assist).',
        planner: 'llm-replan-rules',
      };
    }
  }

  const llmRequest: AutonomousPlanRequest = {
    ...request,
    planKind: 'recovery',
  };

  try {
    const llmResponse = await callAutonomousLlmPlanner(llmRequest);
    const parsed = parseLlmPlanJson(llmResponse.content);
    if (parsed && parsed.steps.length > 0) {
      return {
        steps: prefixRecoverySteps(parsed.steps),
        reasoning: parsed.reasoning,
        planner: `llm-replan-v1-${llmResponse.provider}`,
      };
    }
  } catch {
    // fall through
  }

  return { steps: [], reasoning: 'LLM recovery produced no steps', planner: 'llm-replan-empty' };
}
