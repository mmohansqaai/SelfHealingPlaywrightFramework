import type { TestInfo } from '@playwright/test';
import type { AutonomousRunResult, AutonomousSuiteKpis } from 'autonomous-agent-contracts';
import { formatHumanReviewBody } from '../autonomous/human-review';
import { formatAutonomousSuiteKpisBody } from '../autonomous/kpis';
import { formatAutonomousTraceBody } from '../autonomous/run-autonomous-test';
import { generatePlaywrightSpecFromTrace } from '../autonomous/trace-to-spec';

/** Attach Phase 8 autonomous run trace to the Playwright HTML report. */
export function attachAutonomousTrace(testInfo: TestInfo, result: AutonomousRunResult): Promise<void> {
  return testInfo.attach('autonomous-trace', {
    body: formatAutonomousTraceBody(result),
    contentType: 'text/plain',
  });
}

/** Attach Phase 10 suite KPI rollup for dashboard / CI review. */
export async function attachAutonomousSuiteKpis(testInfo: TestInfo, kpis: AutonomousSuiteKpis): Promise<void> {
  await testInfo.attach('autonomous-suite-kpis', {
    body: formatAutonomousSuiteKpisBody(kpis),
    contentType: 'text/plain',
  });
  await testInfo.attach('autonomous-suite-kpis-json', {
    body: JSON.stringify(kpis, null, 2),
    contentType: 'application/json',
  });
}

/** Attach human-review package when governance flags a failed autonomous run. */
export async function attachAutonomousHumanReview(testInfo: TestInfo, result: AutonomousRunResult): Promise<void> {
  await testInfo.attach('autonomous-human-review', {
    body: formatHumanReviewBody(result),
    contentType: 'text/plain',
  });
  if (result.status === 'completed') {
    await testInfo.attach('autonomous-generated-spec', {
      body: generatePlaywrightSpecFromTrace(result, result.journeyId ?? 'autonomous'),
      contentType: 'text/plain',
    });
  }
}
