import type { AutonomousPlanRequest, AutonomousPlanResponse } from 'autonomous-agent-contracts';
import { planAutonomousGoalWithLlm } from './llm-planner';
import { planAutonomousGoalMock } from './mock-planner';

function resolvePlannerMode(request: AutonomousPlanRequest): 'mock' | 'llm' {
  if (request.plannerMode) return request.plannerMode;
  return process.env.AUTONOMOUS_PLANNER === 'llm' ? 'llm' : 'mock';
}

/** Route to mock (deterministic) or LLM planner. */
export async function planAutonomousGoalAsync(
  request: AutonomousPlanRequest
): Promise<AutonomousPlanResponse> {
  const mode = resolvePlannerMode(request);
  if (mode === 'llm') {
    return planAutonomousGoalWithLlm(request);
  }
  return planAutonomousGoalMock(request);
}
