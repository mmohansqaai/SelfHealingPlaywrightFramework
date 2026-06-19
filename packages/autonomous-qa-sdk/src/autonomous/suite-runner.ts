import type { Page } from '@playwright/test';
import type {
  AutonomousJourneyDefinition,
  AutonomousRunOptions,
  AutonomousRunResult,
  AutonomousSuiteResult,
} from 'autonomous-agent-contracts';
import { resolveAutonomousGovernanceFromEnv } from './governance';
import { buildAutonomousSuiteResult } from './kpis';
import { runAutonomousTest } from './run-autonomous-test';

export type RunAutonomousSuiteOptions = {
  governance?: AutonomousRunOptions['governance'];
  /** Stop executing further journeys when suite cost cap exceeded. Default true. */
  stopOnSuiteCostCap?: boolean;
  /** Default options applied to each journey. */
  defaults?: Partial<AutonomousRunOptions>;
};

/**
 * Phase 10 — run multiple autonomous journeys with suite-level cost cap and KPI rollup.
 */
export async function runAutonomousSuite(
  page: Page,
  journeys: AutonomousJourneyDefinition[],
  options: RunAutonomousSuiteOptions = {}
): Promise<AutonomousSuiteResult> {
  const governance = resolveAutonomousGovernanceFromEnv(options.governance ?? {});
  const stopOnSuiteCostCap = options.stopOnSuiteCostCap !== false;
  const results: AutonomousRunResult[] = [];

  for (const journey of journeys) {
    const partial = buildAutonomousSuiteResult(results, governance.maxCostUsdPerSuite);
    if (stopOnSuiteCostCap && partial.suiteCostCapExceeded) {
      break;
    }

    const result = await runAutonomousTest(page, {
      ...options.defaults,
      goal: journey.goal,
      startUrl: journey.startUrl,
      maxSteps: journey.maxSteps ?? options.defaults?.maxSteps,
      timeoutPerActionMs: journey.timeoutPerActionMs ?? options.defaults?.timeoutPerActionMs,
      journeyId: journey.id,
      governance: options.governance,
      allowedDomains: options.defaults?.allowedDomains ?? governance.allowedDomains,
    });
    results.push(result);
  }

  return buildAutonomousSuiteResult(results, governance.maxCostUsdPerSuite);
}
