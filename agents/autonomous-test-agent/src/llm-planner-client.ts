import type { AutonomousPlanRequest } from 'autonomous-agent-contracts';
import { resolvePlannerPrompts } from './llm-planner-prompt';
import { planAutonomousGoalMock } from './mock-planner';
import { replanAfterAssertionFailure, isAssertionAction } from './replan';

export type AutonomousLlmProvider = 'mock' | 'openai' | 'anthropic';

export function resolveAutonomousLlmProvider(): AutonomousLlmProvider {
  const raw = process.env.AUTONOMOUS_LLM_PROVIDER ?? process.env.HEALING_LLM_PROVIDER ?? 'mock';
  if (raw === 'openai' || raw === 'anthropic') return raw;
  return 'mock';
}

export function resolveAutonomousLlmApiKey(): string | undefined {
  return process.env.AUTONOMOUS_LLM_API_KEY ?? process.env.HEALING_LLM_API_KEY ?? process.env.OPENAI_API_KEY;
}

export type AutonomousLlmPlanResponse = {
  content: string;
  model: string;
  provider: AutonomousLlmProvider;
};

/** Call LLM (or mock) to produce raw JSON plan text. */
export async function callAutonomousLlmPlanner(
  request: AutonomousPlanRequest
): Promise<AutonomousLlmPlanResponse> {
  const provider = resolveAutonomousLlmProvider();

  if (provider === 'mock') {
    if (request.planKind === 'recovery' && request.recoveryContext) {
      const ctx = request.recoveryContext;
      let steps = isAssertionAction(ctx.failedAction)
        ? replanAfterAssertionFailure({
            goal: request.goal,
            failedStepId: ctx.failedStepId,
            failedAction: ctx.failedAction,
            pageUrl: request.pageState?.url ?? '',
            completedStepIds: ctx.completedStepIds,
          })
        : [
            {
              id: 'llm-replan-wait',
              action: { type: 'wait' as const, ms: 500 },
              reasoning: 'Mock LLM recovery: wait for UI to settle.',
            },
            {
              id: 'llm-replan-retry',
              action: ctx.failedAction,
              reasoning: 'Mock LLM recovery: retry failed action.',
            },
          ];
      return {
        content: JSON.stringify({
          reasoning: 'Mock LLM recovery plan',
          steps,
        }),
        model: 'mock-autonomous-llm-v1',
        provider: 'mock',
      };
    }
    const mock = planAutonomousGoalMock(request);
    return {
      content: JSON.stringify({ reasoning: mock.reasoning, steps: mock.steps }),
      model: 'mock-autonomous-llm-v1',
      provider: 'mock',
    };
  }

  const apiKey = resolveAutonomousLlmApiKey();
  if (!apiKey) {
    throw new Error(
      `${provider} planner requires AUTONOMOUS_LLM_API_KEY or HEALING_LLM_API_KEY`
    );
  }

  if (provider === 'openai') {
    return callOpenAiPlanner(request, apiKey);
  }

  return callAnthropicPlanner(request, apiKey);
}

async function callOpenAiPlanner(
  request: AutonomousPlanRequest,
  apiKey: string
): Promise<AutonomousLlmPlanResponse> {
  const model = process.env.AUTONOMOUS_LLM_MODEL ?? process.env.HEALING_LLM_MODEL ?? 'gpt-4o-mini';
  const timeoutMs = Number(process.env.AUTONOMOUS_LLM_TIMEOUT_MS ?? process.env.HEALING_LLM_TIMEOUT_MS ?? 45_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { system, user } = resolvePlannerPrompts(request);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: Number(process.env.AUTONOMOUS_LLM_MAX_TOKENS ?? 2500),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI API error ${response.status}`);
    }

    return {
      content: payload.choices?.[0]?.message?.content ?? '{}',
      model,
      provider: 'openai',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropicPlanner(
  request: AutonomousPlanRequest,
  apiKey: string
): Promise<AutonomousLlmPlanResponse> {
  const model =
    process.env.AUTONOMOUS_LLM_MODEL ?? process.env.HEALING_LLM_MODEL ?? 'claude-3-5-haiku-20241022';
  const timeoutMs = Number(process.env.AUTONOMOUS_LLM_TIMEOUT_MS ?? process.env.HEALING_LLM_TIMEOUT_MS ?? 45_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { system, user } = resolvePlannerPrompts(request);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: Number(process.env.AUTONOMOUS_LLM_MAX_TOKENS ?? 2500),
        temperature: 0,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as {
      error?: { message?: string };
      content?: Array<{ type?: string; text?: string }>;
    };

    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Anthropic API error ${response.status}`);
    }

    const text = payload.content?.find((c) => c.type === 'text')?.text ?? '{}';
    return { content: text, model, provider: 'anthropic' };
  } finally {
    clearTimeout(timer);
  }
}
