import type { AutonomousRunResult } from 'autonomous-agent-contracts';

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function traceStepToCode(step: AutonomousRunResult['trace'][number], indent: string): string[] {
  const action = step.action;
  const lines: string[] = [];

  if (!step.ok) return lines;

  switch (action.type) {
    case 'navigate':
      lines.push(`${indent}await page.goto('${escapeString(action.url)}');`);
      break;
    case 'fill':
      lines.push(
        `${indent}// fill: ${action.targetHint}`,
        `${indent}await page.getByLabel(/${action.targetHint.split(/\s+/)[0]}/i).fill('${escapeString(action.value)}');`
      );
      break;
    case 'click':
      lines.push(
        `${indent}// click: ${action.targetHint}`,
        `${indent}await page.getByRole('button').first().click();`
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
    case 'wait':
      lines.push(`${indent}await page.waitForTimeout(${action.ms});`);
      break;
    default:
      lines.push(`${indent}// ${step.stepId}: ${action.type}`);
  }

  return lines;
}

/**
 * Phase 10 — convert a successful autonomous trace into a starter Playwright spec (human review required).
 */
export function generatePlaywrightSpecFromTrace(result: AutonomousRunResult, testName = 'generated autonomous journey'): string {
  const lines = [
    "import { test, expect } from '@playwright/test';",
    '',
    `test('${escapeString(testName)} @generated-from-autonomous', async ({ page }) => {`,
    `  // Generated from autonomous run — review before merging`,
    `  // Goal: ${result.goal.replace(/'/g, "\\'")}`,
    `  // Planner: ${result.planner} | Steps: ${result.stepsExecuted} | Replans: ${result.replanCount}`,
    '',
  ];

  for (const step of result.trace) {
    lines.push(...traceStepToCode(step, '  '));
  }

  lines.push('});', '');
  return lines.join('\n');
}
