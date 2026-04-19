import assert from 'node:assert/strict';

/**
 * When DEMO_DASHBOARD_FAILURES=1 (set in CI), fails the test so reports/dashboards show mixed pass/fail.
 * Unset locally for an all-green run.
 */
export function failIfDemoDashboardMetrics(): void {
  if (process.env.DEMO_DASHBOARD_FAILURES === '1') {
    assert.fail('Demo: intentional failure for dashboard metrics');
  }
}
