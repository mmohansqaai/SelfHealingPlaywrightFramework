import type { TestInfo } from '@playwright/test';
import type { HealingResult } from './healing-types';

/** Attach healing metadata to the test report (visible in HTML report). */
export function attachHealingSummary(
  testInfo: TestInfo,
  label: string,
  result: HealingResult<unknown>
): Promise<void> {
  const lines = [
    `Used strategy: ${result.usedStrategy}`,
    '',
    'Attempts:',
    ...result.attempts.map((a) => `${a.ok ? '✓' : '✗'} ${a.strategy}${a.error ? ` — ${a.error}` : ''}`),
  ];
  return testInfo.attach(`${label}-healing`, {
    body: lines.join('\n'),
    contentType: 'text/plain',
  });
}
