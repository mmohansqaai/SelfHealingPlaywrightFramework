import type { AutonomousPageState, AutonomousStepTrace, AutonomousVerificationRecord } from 'autonomous-agent-contracts';
import { redactSecretsInGoalText } from './redact-secrets';
import { formatPageStateForPrompt } from './page-state-format';

export function getLlmVerificationSystemPrompt(): string {
  return [
    'You are a QA verification agent for autonomous Playwright test runs on Nova Retail.',
    'Given the original test goal, current page state, and execution trace, decide if the goal was truly satisfied.',
    '',
    'Output ONLY valid JSON:',
    '{',
    '  "passed": boolean,',
    '  "confidence": number (0-1),',
    '  "reasoning": string,',
    '  "checks": [{ "checkId": string, "passed": boolean, "detail": string }]',
    '}',
    '',
    'Rules:',
    '- Be strict: login goals fail if still on /login.',
    '- Checkout goals fail unless URL or page content shows checkout/cart progress.',
    '- Do not pass if trace shows failed steps that were not recovered.',
    '- confidence < 0.7 should set passed=false.',
  ].join('\n');
}

export function buildLlmVerificationUserPrompt(params: {
  goal: string;
  pageState?: AutonomousPageState;
  trace: AutonomousStepTrace[];
}): string {
  const safeGoal = redactSecretsInGoalText(params.goal);
  const traceLines = params.trace.slice(-12).map((t) => {
    const mark = t.ok ? 'ok' : 'FAIL';
    return `- ${t.stepId} (${t.action.type}): ${mark}${t.error ? ` — ${t.error}` : ''} @ ${t.pageUrl ?? ''}`;
  });

  return [
    `Goal: ${safeGoal}`,
    '',
    'Current page state:',
    formatPageStateForPrompt(params.pageState),
    '',
    'Execution trace (recent):',
    traceLines.length ? traceLines.join('\n') : '(empty)',
    '',
    'Did the agent satisfy the goal? Return JSON verification verdict.',
  ].join('\n');
}

export function parseLlmVerificationJson(content: string): {
  passed: boolean;
  confidence: number;
  reasoning: string;
  checks: AutonomousVerificationRecord[];
} | null {
  try {
    const trimmed = content.trim();
    const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return null;
    const body = JSON.parse(jsonText) as Record<string, unknown>;
    const passed = body.passed === true;
    const confidence = typeof body.confidence === 'number' ? body.confidence : passed ? 0.8 : 0.3;
    const reasoning = typeof body.reasoning === 'string' ? body.reasoning : 'LLM verification';
    const checks: AutonomousVerificationRecord[] = [];

    if (Array.isArray(body.checks)) {
      for (const row of body.checks) {
        if (!row || typeof row !== 'object') continue;
        const c = row as Record<string, unknown>;
        if (typeof c.checkId !== 'string') continue;
        checks.push({
          checkId: c.checkId,
          passed: c.passed === true,
          detail: typeof c.detail === 'string' ? c.detail : reasoning,
        });
      }
    }

    checks.push({
      checkId: 'llm-goal-satisfied',
      passed: passed && confidence >= 0.7,
      detail: `${reasoning} (confidence: ${confidence.toFixed(2)})`,
    });

    return { passed: passed && confidence >= 0.7, confidence, reasoning, checks };
  } catch {
    return null;
  }
}

/** Mock LLM verification — strict rule-based checks (no API). */
export function mockLlmVerification(params: {
  goal: string;
  pageState?: AutonomousPageState;
  trace: AutonomousStepTrace[];
}): AutonomousVerificationRecord[] {
  const path = (() => {
    try {
      return new URL(params.pageState?.url ?? '').pathname;
    } catch {
      return params.pageState?.url ?? '';
    }
  })();
  const goal = params.goal.toLowerCase();
  const failedSteps = params.trace.filter((t) => !t.ok);
  const checks: AutonomousVerificationRecord[] = [];

  checks.push({
    checkId: 'trace-no-unresolved-failures',
    passed: failedSteps.length === 0,
    detail:
      failedSteps.length === 0
        ? 'No failed steps in trace'
        : `${failedSteps.length} failed step(s): ${failedSteps.map((f) => f.stepId).join(', ')}`,
  });

  if (/\blog\s*in\b|\blogin\b|\bsign\s*in\b|\bauthenticate\b/i.test(goal)) {
    checks.push({
      checkId: 'left-login-page',
      passed: !/\/login\/?$/.test(path),
      detail: `Path after run: ${path}`,
    });
  }

  if (goal.includes('checkout') || goal.includes('payment')) {
    checks.push({
      checkId: 'checkout-reached',
      passed: /\/app\/(checkout|cart)/.test(path),
      detail: `Expected checkout/cart path, got ${path}`,
    });
  }

  if (goal.includes('cart') || goal.includes('basket')) {
    checks.push({
      checkId: 'cart-path-or-signal',
      passed:
        /\/app\/(cart|checkout)/.test(path) ||
        /cart|basket|item|total/i.test(params.pageState?.title ?? ''),
      detail: `Cart/basket verification for path ${path}`,
    });
  }

  const allPassed = checks.every((c) => c.passed);
  checks.push({
    checkId: 'llm-goal-satisfied',
    passed: allPassed,
    detail: allPassed ? 'Mock LLM verification: goal satisfied' : 'Mock LLM verification: goal NOT satisfied',
  });

  return checks;
}
