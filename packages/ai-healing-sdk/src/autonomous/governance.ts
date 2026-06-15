import type { AutonomousGovernanceOptions, AutonomousSecrets } from 'autonomous-agent-contracts';

const PLACEHOLDER_EMAIL = /\{\{(?:CUSTOMER_)?EMAIL\}\}/g;
const PLACEHOLDER_PASSWORD = /\{\{(?:CUSTOMER_)?PASSWORD\}\}/g;

/** Load demo/customer credentials from env — never commit real secrets in goal strings. */
export function resolveAutonomousSecretsFromEnv(): AutonomousSecrets {
  return {
    customerEmail: process.env.AUTONOMOUS_CUSTOMER_EMAIL ?? process.env.CUSTOMER_EMAIL ?? 'test@demo.com',
    customerPassword:
      process.env.AUTONOMOUS_CUSTOMER_PASSWORD ?? process.env.CUSTOMER_PASSWORD ?? 'password123',
  };
}

/** Replace {{CUSTOMER_EMAIL}} / {{CUSTOMER_PASSWORD}} placeholders in NL goals. */
export function injectSecretsIntoGoal(goal: string, secrets: AutonomousSecrets = resolveAutonomousSecretsFromEnv()): string {
  let resolved = goal;
  if (secrets.customerEmail) {
    resolved = resolved.replace(PLACEHOLDER_EMAIL, secrets.customerEmail);
  }
  if (secrets.customerPassword) {
    resolved = resolved.replace(PLACEHOLDER_PASSWORD, secrets.customerPassword);
  }
  return resolved;
}

export function goalUsesSecretPlaceholders(goal: string): boolean {
  return /\{\{(?:CUSTOMER_)?EMAIL\}\}/.test(goal) || /\{\{(?:CUSTOMER_)?PASSWORD\}\}/.test(goal);
}

export function resolveAutonomousGovernanceFromEnv(
  overrides: AutonomousGovernanceOptions = {}
): Required<Omit<AutonomousGovernanceOptions, 'allowedDomains'>> & { allowedDomains: string[] } {
  const inCi = process.env.CI === 'true' || process.env.CI === '1';
  const domainsRaw = overrides.allowedDomains ?? process.env.AUTONOMOUS_ALLOWED_DOMAINS ?? 'vercel.app';
  const allowedDomains = (Array.isArray(domainsRaw) ? domainsRaw : domainsRaw.split(','))
    .map((d: string) => d.trim())
    .filter(Boolean);

  return {
    allowedDomains,
    maxCostUsdPerRun: overrides.maxCostUsdPerRun ?? Number(process.env.AUTONOMOUS_MAX_COST_USD ?? 0.25),
    maxCostUsdPerSuite: overrides.maxCostUsdPerSuite ?? Number(process.env.AUTONOMOUS_MAX_SUITE_COST_USD ?? 2),
    requireMockPlannerInCi:
      overrides.requireMockPlannerInCi ??
      (inCi && process.env.AUTONOMOUS_ALLOW_LLM_IN_CI !== '1' && process.env.RUN_AUTONOMOUS_LLM !== '1' && process.env.RUN_AUTONOMOUS_EVAL !== '1'),
    humanReviewOnFailure: overrides.humanReviewOnFailure ?? true,
  };
}

export function isDomainAllowed(hostname: string, allowedDomains: string[]): boolean {
  if (!allowedDomains.length) return true;
  return allowedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

export function assertPlannerAllowedForCi(
  plannerMode: 'mock' | 'llm' | undefined,
  governance: Required<AutonomousGovernanceOptions>
): void {
  if (!governance.requireMockPlannerInCi) return;
  const mode = plannerMode ?? 'mock';
  if (mode === 'llm') {
    throw new Error(
      'LLM planner is blocked in CI when requireMockPlannerInCi is enabled. Set plannerMode to "mock" or AUTONOMOUS_CI=1.'
    );
  }
}
