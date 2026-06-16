import type { AutonomousPageState, AutonomousStepTrace, AutonomousVerificationRecord } from 'autonomous-agent-contracts';
import {
  buildLlmVerificationUserPrompt,
  getLlmVerificationSystemPrompt,
  mockLlmVerification,
  parseLlmVerificationJson,
} from './llm-verification-agent';
import { resolveAutonomousLlmApiKey, resolveAutonomousLlmProvider } from './llm-planner-client';

export type LlmVerificationParams = {
  goal: string;
  pageState?: AutonomousPageState;
  trace: AutonomousStepTrace[];
};

export function isLlmVerificationEnabled(plannerMode?: 'mock' | 'llm'): boolean {
  if (process.env.AUTONOMOUS_LLM_VERIFY === '0') return false;
  if (process.env.AUTONOMOUS_LLM_VERIFY === '1') return true;
  return plannerMode === 'llm' || process.env.AUTONOMOUS_PLANNER === 'llm';
}

/** Phase 14 — LLM (or mock) verification that the goal was truly satisfied. */
export async function runLlmVerificationAgent(
  params: LlmVerificationParams,
  plannerMode?: 'mock' | 'llm'
): Promise<AutonomousVerificationRecord[]> {
  if (!isLlmVerificationEnabled(plannerMode)) return [];

  const provider = resolveAutonomousLlmProvider();
  if (provider === 'mock') {
    return mockLlmVerification(params);
  }

  const apiKey = resolveAutonomousLlmApiKey();
  if (!apiKey) {
    return [
      {
        checkId: 'llm-goal-satisfied',
        passed: false,
        detail: 'LLM verification skipped: missing API key',
      },
    ];
  }

  const system = getLlmVerificationSystemPrompt();
  const user = buildLlmVerificationUserPrompt(params);

  try {
    const content =
      provider === 'openai'
        ? await callOpenAiVerification(system, user, apiKey)
        : await callAnthropicVerification(system, user, apiKey);

    const parsed = parseLlmVerificationJson(content);
    if (parsed) return parsed.checks;

    return mockLlmVerification(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        checkId: 'llm-goal-satisfied',
        passed: false,
        detail: `LLM verification error: ${message}`,
      },
    ];
  }
}

async function callOpenAiVerification(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.AUTONOMOUS_LLM_MODEL ?? process.env.HEALING_LLM_MODEL ?? 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI ${response.status}`);
  return payload.choices?.[0]?.message?.content ?? '{}';
}

async function callAnthropicVerification(system: string, user: string, apiKey: string): Promise<string> {
  const model =
    process.env.AUTONOMOUS_LLM_MODEL ?? process.env.HEALING_LLM_MODEL ?? 'claude-3-5-haiku-20241022';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  };
  if (!response.ok) throw new Error(payload.error?.message ?? `Anthropic ${response.status}`);
  return payload.content?.find((c) => c.type === 'text')?.text ?? '{}';
}
