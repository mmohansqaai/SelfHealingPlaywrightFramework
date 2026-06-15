import type { AutonomousAction, AutonomousPlannedStep } from 'autonomous-agent-contracts';

const ALLOWED_TYPES = new Set([
  'navigate',
  'fill',
  'click',
  'wait',
  'assert_url',
  'assert_visible',
  'assert_heading',
  'assert_text',
  'complete',
  'fail',
]);

function parseAction(raw: unknown): AutonomousAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const action = raw as Record<string, unknown>;
  const type = action.type;
  if (typeof type !== 'string' || !ALLOWED_TYPES.has(type)) return null;

  switch (type) {
    case 'navigate':
      return typeof action.url === 'string' ? { type: 'navigate', url: action.url } : null;
    case 'fill':
      return typeof action.targetHint === 'string' && typeof action.value === 'string'
        ? { type: 'fill', targetHint: action.targetHint, value: action.value }
        : null;
    case 'click':
      return typeof action.targetHint === 'string' ? { type: 'click', targetHint: action.targetHint } : null;
    case 'wait':
      return typeof action.ms === 'number' ? { type: 'wait', ms: action.ms } : null;
    case 'assert_url':
      return {
        type: 'assert_url',
        mustMatch: typeof action.mustMatch === 'string' ? action.mustMatch : undefined,
        mustNotMatch: typeof action.mustNotMatch === 'string' ? action.mustNotMatch : undefined,
      };
    case 'assert_visible':
      return typeof action.targetHint === 'string'
        ? { type: 'assert_visible', targetHint: action.targetHint }
        : null;
    case 'assert_heading':
      return typeof action.textHint === 'string' ? { type: 'assert_heading', textHint: action.textHint } : null;
    case 'assert_text':
      return typeof action.textHint === 'string' ? { type: 'assert_text', textHint: action.textHint } : null;
    case 'complete':
      return typeof action.message === 'string' ? { type: 'complete', message: action.message } : null;
    case 'fail':
      return typeof action.reason === 'string' ? { type: 'fail', reason: action.reason } : null;
    default:
      return null;
  }
}

export function parseLlmPlanJson(content: string): { reasoning: string; steps: AutonomousPlannedStep[] } | null {
  let parsed: unknown;
  try {
    const trimmed = content.trim();
    const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return null;
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const body = parsed as Record<string, unknown>;
  const reasoning = typeof body.reasoning === 'string' ? body.reasoning : 'LLM plan';
  if (!Array.isArray(body.steps)) return null;

  const steps: AutonomousPlannedStep[] = [];
  for (let i = 0; i < body.steps.length; i++) {
    const row = body.steps[i];
    if (!row || typeof row !== 'object') return null;
    const step = row as Record<string, unknown>;
    const id = typeof step.id === 'string' ? step.id : `llm-step-${i + 1}`;
    const stepReasoning = typeof step.reasoning === 'string' ? step.reasoning : reasoning;
    const action = parseAction(step.action);
    if (!action) return null;
    steps.push({ id, action, reasoning: stepReasoning });
  }

  if (steps.length === 0) return null;
  return { reasoning, steps };
}
