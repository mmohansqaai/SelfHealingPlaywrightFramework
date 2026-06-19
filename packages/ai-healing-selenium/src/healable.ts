import type { GeneratedLocatorQuery } from 'ai-healing-core';
import { formatLocatorQuery } from 'ai-healing-core';
import { runDriverHealingLoop } from 'ai-healing-agent';
import { getActiveWebDriver, getSeleniumHealingConfig } from './config';
import { createSeleniumDriver } from './selenium-driver';

type QueryInput = GeneratedLocatorQuery | string;

export type HealableClickOptions = {
  force?: boolean;
  timeoutPerStrategyMs?: number;
};

export type HealableFillOptions = {
  timeoutPerStrategyMs?: number;
};

export type HealableVisibleOptions = {
  timeoutPerStrategyMs?: number;
};

function normalizeQuery(query: QueryInput): GeneratedLocatorQuery {
  if (typeof query === 'string') return { type: 'css', value: query };
  return query;
}

function healingOptions() {
  const config = getSeleniumHealingConfig();
  return {
    framework: config.framework,
    healingEnabled: config.healingEnabled,
    healingServiceUrl: config.healingServiceUrl,
    agentMode: config.agentMode,
    maxIterations: config.maxIterations,
    maxCandidates: config.maxCandidates,
    timeoutMs: config.timeoutPerStrategyMs,
  };
}

export const healable = {
  async click(query: QueryInput, options?: HealableClickOptions) {
    const driver = createSeleniumDriver(getActiveWebDriver());
    const q = normalizeQuery(query);
    return runDriverHealingLoop(
      driver,
      'click',
      q,
      (candidate) => driver.click(candidate, { timeoutMs: options?.timeoutPerStrategyMs, force: options?.force }),
      healingOptions()
    );
  },

  async fill(query: QueryInput, value: string, options?: HealableFillOptions) {
    const driver = createSeleniumDriver(getActiveWebDriver());
    const q = normalizeQuery(query);
    return runDriverHealingLoop(
      driver,
      'fill',
      q,
      (candidate) => driver.fill(candidate, value, { timeoutMs: options?.timeoutPerStrategyMs }),
      healingOptions()
    );
  },

  async expectVisible(query: QueryInput, options?: HealableVisibleOptions) {
    const driver = createSeleniumDriver(getActiveWebDriver());
    const q = normalizeQuery(query);
    return runDriverHealingLoop(
      driver,
      'visible',
      q,
      async (candidate) => {
        const visible = await driver.isVisible(candidate, { timeoutMs: options?.timeoutPerStrategyMs });
        if (!visible) throw new Error(`Locator not visible: ${formatLocatorQuery(candidate)}`);
      },
      healingOptions()
    );
  },
};

export type HealableApi = typeof healable;
