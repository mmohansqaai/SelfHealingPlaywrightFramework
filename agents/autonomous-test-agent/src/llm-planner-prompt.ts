import type { AutonomousPlanRequest } from 'autonomous-agent-contracts';

export function getAutonomousPlannerSystemPrompt(): string {
  return [
    'You are an autonomous Playwright test planner for the Nova Retail demo web app.',
    'Given a natural-language test goal, output a JSON plan of browser actions.',
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
    '- For login goals: fill email, fill password, click sign in, assert_url mustNotMatch /login, complete.',
    '- Prefer relative paths when startUrl is provided.',
    '- Max 20 steps. End with complete or fail.',
    '- Output ONLY valid JSON: { "reasoning": string, "steps": [{ "id", "action", "reasoning" }] }',
  ].join('\n');
}

export function buildAutonomousPlannerUserPrompt(request: AutonomousPlanRequest): string {
  const lines = [
    `Goal: ${request.goal.trim()}`,
    request.startUrl ? `Start URL (already loaded or navigate first): ${request.startUrl}` : '',
    '',
    'Nova Retail hints: login at /login; after login users land on /app/*; products at /app/products; cart at /app/cart; checkout at /app/checkout.',
    'Credentials in the goal use format: email / password',
  ].filter(Boolean);
  return lines.join('\n');
}
