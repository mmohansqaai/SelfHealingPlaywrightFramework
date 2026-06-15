import type { AutonomousPlanRequest } from 'autonomous-agent-contracts';
import { formatPageStateForPrompt } from './page-state-format';
import { redactSecretsInGoalText } from './redact-secrets';

export function getAutonomousPlannerSystemPrompt(): string {
  return [
    'You are an autonomous Playwright test planner for the Nova Retail demo web app.',
    'Given a natural-language test goal and current page state, output a JSON plan of browser actions.',
    '',
    'Allowed action types (exact field names):',
    '- navigate: { "type": "navigate", "url": "/relative/or/full/url" }',
    '- fill: { "type": "fill", "targetHint": "human hint for field", "value": "text" }',
    '- click: { "type": "click", "targetHint": "human hint for button/link" }',
    '- wait: { "type": "wait", "ms": 500 }',
    '- assert_url: { "type": "assert_url", "mustNotMatch": "/login" } or mustMatch',
    '- assert_visible: { "type": "assert_visible", "targetHint": "..." }',
    '- assert_heading: { "type": "assert_heading", "textHint": "Products|regex" }',
    '- assert_text: { "type": "assert_text", "textHint": "cart|checkout" }',
    '- complete: { "type": "complete", "message": "why goal is done" }',
    '- fail: { "type": "fail", "reason": "why impossible" }',
    '',
    'Rules:',
    '- Use targetHint strings (not CSS selectors) — the executor resolves locators with self-healing.',
    '- Match targetHint to visible element labels from page state when provided.',
    '- For login goals: fill email, fill password, click sign in, assert_url mustNotMatch /login, complete.',
    '- Prefer relative paths when startUrl is provided.',
    '- Max 20 steps. End with complete or fail.',
    '- Never echo real passwords in reasoning — use {{REDACTED_PASSWORD}} in text fields if needed.',
    '- Output ONLY valid JSON: { "reasoning": string, "steps": [{ "id", "action", "reasoning" }] }',
  ].join('\n');
}

export function buildAutonomousPlannerUserPrompt(request: AutonomousPlanRequest): string {
  const safeGoal = redactSecretsInGoalText(request.goal.trim());
  const lines = [
    `Goal: ${safeGoal}`,
    request.startUrl ? `Start URL: ${request.startUrl}` : '',
    request.planKind === 'recovery' ? 'Mode: RECOVERY (short plan only)' : 'Mode: INITIAL full journey plan',
    '',
    'Current page state:',
    formatPageStateForPrompt(request.pageState),
    '',
    'Nova Retail hints: login at /login; after login users land on /app/*; products at /app/products; cart at /app/cart; checkout at /app/checkout.',
    'Credentials in the goal use format: email / password (values may be redacted).',
  ].filter(Boolean);
  return lines.join('\n');
}

export function getRecoverySystemPrompt(): string {
  return (
    getAutonomousPlannerSystemPrompt() +
    '\n\nRECOVERY MODE: A step failed. Propose 1–5 recovery steps only. Do not repeat completed steps.'
  );
}

export function buildRecoveryUserPrompt(request: AutonomousPlanRequest): string {
  const base = buildAutonomousPlannerUserPrompt(request);
  const recovery = request.recoveryContext;
  if (!recovery) return base;

  return [
    base,
    '',
    '--- RECOVERY CONTEXT ---',
    `Failed step: ${recovery.failedStepId}`,
    `Failed action: ${JSON.stringify(recovery.failedAction)}`,
    recovery.error ? `Error: ${recovery.error}` : '',
    `Completed steps: ${recovery.completedStepIds.join(', ') || '(none)'}`,
    recovery.recentTraceSummary?.length
      ? `Recent trace:\n${recovery.recentTraceSummary.map((l) => `- ${l}`).join('\n')}`
      : '',
    '',
    'Return JSON with recovery steps only (max 5).',
  ]
    .filter(Boolean)
    .join('\n');
}

export function resolvePlannerPrompts(request: AutonomousPlanRequest): {
  system: string;
  user: string;
} {
  if (request.planKind === 'recovery') {
    return { system: getRecoverySystemPrompt(), user: buildRecoveryUserPrompt(request) };
  }
  return { system: getAutonomousPlannerSystemPrompt(), user: buildAutonomousPlannerUserPrompt(request) };
}
