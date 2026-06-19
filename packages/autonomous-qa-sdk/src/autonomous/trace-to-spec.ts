import type { AutonomousRunResult } from 'autonomous-agent-contracts';

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function traceStepToCode(step: AutonomousRunResult['trace'][number], indent: string): string[] {
  const action = step.action;
  const lines: string[] = [];

  if (!step.ok) {
    lines.push(`${indent}// SKIPPED (failed): ${step.stepId}${step.error ? ` — ${step.error}` : ''}`);
    return lines;
  }

  const healComment = step.healed ? ` // self-healed via ${step.usedStrategy ?? 'auto-heal'}` : '';

  switch (action.type) {
    case 'navigate':
      lines.push(`${indent}await page.goto('${escapeString(action.url)}');`);
      break;
    case 'fill':
      lines.push(
        `${indent}// fill: ${action.targetHint}${healComment}`,
        `${indent}await page.getByLabel(/${action.targetHint.split(/\s+/)[0]}/i).fill('${escapeString(action.value)}');`
      );
      break;
    case 'click':
      lines.push(
        `${indent}// click: ${action.targetHint}${healComment}`,
        `${indent}await page.getByRole('button', { name: /${action.targetHint.split(/\s+/)[0]}/i }).click();`
      );
      break;
    case 'assert_url':
      if (action.mustMatch) {
        lines.push(`${indent}await expect(page).toHaveURL(/${action.mustMatch.replace(/\//g, '\\/')}/);`);
      }
      if (action.mustNotMatch) {
        lines.push(`${indent}await expect(page).not.toHaveURL(/${action.mustNotMatch.replace(/\//g, '\\/')}/);`);
      }
      break;
    case 'assert_visible':
      lines.push(`${indent}// assert visible: ${action.targetHint}`);
      break;
    case 'assert_heading':
      lines.push(`${indent}// assert heading: ${action.textHint}`);
      break;
    case 'assert_text':
      lines.push(`${indent}// assert text: ${action.textHint}`);
      break;
    case 'wait':
      lines.push(`${indent}await page.waitForTimeout(${action.ms});`);
      break;
    default:
      lines.push(`${indent}// ${step.stepId}: ${action.type}`);
  }

  return lines;
}

/**
 * Phase 16 — convert a successful autonomous trace into a starter Playwright spec (human review required).
 */
export function generatePlaywrightSpecFromTrace(result: AutonomousRunResult, testName = 'generated autonomous journey'): string {
  const healedCount = result.trace.filter((t) => t.healed).length;
  const lines = [
    "import { test, expect } from '@playwright/test';",
    "import { enableHealing } from 'ai-healing-sdk';",
    '',
    `test('${escapeString(testName)} @generated-from-autonomous @phase16-review-required', async ({ page }) => {`,
    `  // HUMAN REVIEW REQUIRED before merging — generated from autonomous trace`,
    `  // Goal: ${result.goal.replace(/'/g, "\\'")}`,
    `  // Planner: ${result.planner} | Steps: ${result.stepsExecuted} | Replans: ${result.replanCount} | Healed: ${healedCount}`,
    '',
    `  enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });`,
    '',
  ];

  for (const step of result.trace) {
    lines.push(...traceStepToCode(step, '  '));
  }

  lines.push('});', '');
  return lines.join('\n');
}

export function writePlaywrightSpecFromTrace(
  result: AutonomousRunResult,
  outputPath: string,
  testName?: string
): string {
  const spec = generatePlaywrightSpecFromTrace(result, testName);
  return spec;
}
