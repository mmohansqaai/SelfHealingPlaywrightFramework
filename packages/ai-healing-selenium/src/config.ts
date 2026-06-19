export type AgentMode = 'local' | 'remote' | 'auto';

export type SeleniumHealingConfig = {
  healingEnabled: boolean;
  healingServiceUrl?: string;
  framework: string;
  timeoutPerStrategyMs: number;
  maxCandidates: number;
  maxIterations: number;
  agentMode: AgentMode;
  verboseLogs: boolean;
  driver?: import('selenium-webdriver').WebDriver;
};

export const DEFAULT_SELENIUM_HEALING_CONFIG: SeleniumHealingConfig = {
  healingEnabled: true,
  healingServiceUrl: process.env.HEALING_SERVICE_URL,
  framework: 'selenium',
  timeoutPerStrategyMs: Number(process.env.HEALING_SERVICE_TIMEOUT_MS || 8_000),
  maxCandidates: 8,
  maxIterations: Number(process.env.HEALING_AGENT_MAX_ITERATIONS || 3),
  agentMode: (process.env.HEALING_AGENT_MODE as AgentMode) || 'auto',
  verboseLogs: false,
};

let activeConfig: SeleniumHealingConfig = { ...DEFAULT_SELENIUM_HEALING_CONFIG };

export function resolveSeleniumHealingConfig(
  config?: Partial<SeleniumHealingConfig>
): SeleniumHealingConfig {
  return {
    ...DEFAULT_SELENIUM_HEALING_CONFIG,
    ...config,
    healingServiceUrl:
      config?.healingServiceUrl ??
      process.env.HEALING_SERVICE_URL ??
      DEFAULT_SELENIUM_HEALING_CONFIG.healingServiceUrl,
    agentMode: config?.agentMode ?? (process.env.HEALING_AGENT_MODE as AgentMode) ?? DEFAULT_SELENIUM_HEALING_CONFIG.agentMode,
  };
}

export function setSeleniumHealingConfig(config?: Partial<SeleniumHealingConfig>): SeleniumHealingConfig {
  activeConfig = resolveSeleniumHealingConfig(config);
  return activeConfig;
}

export function getSeleniumHealingConfig(): SeleniumHealingConfig {
  return activeConfig;
}

export function getActiveWebDriver(): import('selenium-webdriver').WebDriver {
  const driver = activeConfig.driver;
  if (!driver) {
    throw new Error('No WebDriver registered. Call enableHealing(driver, config) first.');
  }
  return driver;
}
