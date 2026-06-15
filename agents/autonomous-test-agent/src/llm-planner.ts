import type { AutonomousPlanRequest, AutonomousPlanResponse } from 'autonomous-agent-contracts';
import { callAutonomousLlmPlanner } from './llm-planner-client';
import { planAutonomousGoalMock } from './mock-planner';
import { parseLlmPlanJson } from './parse-llm-plan';

/** Phase 12 — LLM-driven planner (OpenAI, Anthropic, or mock LLM). */
export async function planAutonomousGoalWithLlm(
  request: AutonomousPlanRequest
): Promise<AutonomousPlanResponse> {
  const goal = request.goal.trim();
  let llmResponse;

  try {
    llmResponse = await callAutonomousLlmPlanner(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.env.AUTONOMOUS_LLM_FALLBACK_MOCK === '1') {
      const fallback = planAutonomousGoalMock(request);
      return {
        ...fallback,
        planner: 'llm-autonomous-planner-v1-fallback-mock',
        reasoning: `LLM call failed (${message}); used mock fallback.`,
      };
    }
    return {
      goal,
      planner: 'llm-autonomous-planner-v1-error',
      steps: [
        {
          id: 'fail-llm-call',
          action: { type: 'fail', reason: `LLM planner failed: ${message}` },
          reasoning: 'Could not reach or authenticate with LLM provider.',
        },
      ],
      reasoning: message,
    };
  }

  const parsed = parseLlmPlanJson(llmResponse.content);
  if (!parsed) {
    if (process.env.AUTONOMOUS_LLM_FALLBACK_MOCK === '1') {
      const fallback = planAutonomousGoalMock(request);
      return {
        ...fallback,
        planner: `llm-autonomous-planner-v1-${llmResponse.provider}-fallback-mock`,
        reasoning: 'LLM JSON parse failed; used mock fallback.',
      };
    }
    return {
      goal,
      planner: `llm-autonomous-planner-v1-${llmResponse.provider}`,
      steps: [
        {
          id: 'fail-llm-parse',
          action: {
            type: 'fail',
            reason: 'LLM returned an invalid plan JSON shape.',
          },
          reasoning: 'Parse error — expected { reasoning, steps[] }.',
        },
      ],
      reasoning: `Model ${llmResponse.model} returned unparseable plan.`,
    };
  }

  return {
    goal,
    planner: `llm-autonomous-planner-v1-${llmResponse.provider}`,
    steps: parsed.steps,
    reasoning: parsed.reasoning,
  };
}
