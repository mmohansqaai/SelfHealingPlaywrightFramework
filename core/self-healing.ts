import type { Locator, Page } from '@playwright/test';
import type { HealingAttempt, HealingResult, LocatorStrategy } from './healing-types';

const DEFAULT_PER_STRATEGY_MS = 5_000;

function recordFailure(attempts: HealingAttempt[], name: string, error: unknown): void {
  attempts.push({
    strategy: name,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Runs an action against locators from each strategy until one succeeds.
 * Order matters: stable selectors first, fallbacks after.
 */
export async function withHealingPage<T>(
  page: Page,
  strategies: LocatorStrategy[],
  action: (locator: Locator) => Promise<T>,
  options?: { timeoutPerStrategyMs?: number }
): Promise<HealingResult<T>> {
  const attempts: HealingAttempt[] = [];
  let lastError: unknown;

  for (const s of strategies) {
    const locator = s.resolve(page);
    try {
      const value = await action(locator);
      attempts.push({ strategy: s.name, ok: true });
      return { value, usedStrategy: s.name, attempts };
    } catch (e) {
      lastError = e;
      recordFailure(attempts, s.name, e);
    }
  }

  const summary = attempts.map((a) => `${a.strategy}: ${a.error ?? 'unknown'}`).join('\n');
  throw new Error(
    `Self-healing exhausted ${strategies.length} strategies.\n${summary}`,
    { cause: lastError }
  );
}

export async function clickHealing(
  page: Page,
  strategies: LocatorStrategy[],
  options?: { timeoutPerStrategyMs?: number; force?: boolean }
): Promise<HealingResult<void>> {
  const timeout = options?.timeoutPerStrategyMs ?? DEFAULT_PER_STRATEGY_MS;
  return withHealingPage(
    page,
    strategies,
    async (loc) => {
      await loc.first().click({ timeout, force: options?.force });
    },
    options
  );
}

export async function fillHealing(
  page: Page,
  strategies: LocatorStrategy[],
  value: string,
  options?: { timeoutPerStrategyMs?: number }
): Promise<HealingResult<void>> {
  const timeout = options?.timeoutPerStrategyMs ?? DEFAULT_PER_STRATEGY_MS;
  return withHealingPage(
    page,
    strategies,
    async (loc) => {
      await loc.first().fill(value, { timeout });
    },
    options
  );
}

export async function expectVisibleHealing(
  page: Page,
  strategies: LocatorStrategy[],
  options?: { timeoutPerStrategyMs?: number }
): Promise<HealingResult<void>> {
  const timeout = options?.timeoutPerStrategyMs ?? DEFAULT_PER_STRATEGY_MS;
  return withHealingPage(
    page,
    strategies,
    async (loc) => {
      await loc.first().waitFor({ state: 'visible', timeout });
    },
    options
  );
}
