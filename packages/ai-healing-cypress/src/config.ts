export type AgentMode = 'local' | 'remote' | 'auto';

export type CypressHealingConfig = {
  healingEnabled: boolean;
  healingServiceUrl?: string;
  framework: string;
  timeoutPerStrategyMs: number;
  maxCandidates: number;
  maxIterations: number;
  agentMode: AgentMode;
  verboseLogs: boolean;
};

export const DEFAULT_CYPRESS_HEALING_CONFIG: CypressHealingConfig = {
  healingEnabled: true,
  healingServiceUrl: process.env.HEALING_SERVICE_URL,
  framework: 'cypress',
  timeoutPerStrategyMs: Number(process.env.HEALING_SERVICE_TIMEOUT_MS || 8_000),
  maxCandidates: 8,
  maxIterations: Number(process.env.HEALING_AGENT_MAX_ITERATIONS || 3),
  agentMode: (process.env.HEALING_AGENT_MODE as AgentMode) || 'auto',
  verboseLogs: false,
};

let activeConfig: CypressHealingConfig = { ...DEFAULT_CYPRESS_HEALING_CONFIG };

export function resolveCypressHealingConfig(
  config?: Partial<CypressHealingConfig>
): CypressHealingConfig {
  return {
    ...DEFAULT_CYPRESS_HEALING_CONFIG,
    ...config,
    healingServiceUrl:
      config?.healingServiceUrl ??
      process.env.HEALING_SERVICE_URL ??
      DEFAULT_CYPRESS_HEALING_CONFIG.healingServiceUrl,
    agentMode: config?.agentMode ?? (process.env.HEALING_AGENT_MODE as AgentMode) ?? DEFAULT_CYPRESS_HEALING_CONFIG.agentMode,
  };
}

export function setCypressHealingConfig(config?: Partial<CypressHealingConfig>): CypressHealingConfig {
  activeConfig = resolveCypressHealingConfig(config);
  return activeConfig;
}

export function getCypressHealingConfig(): CypressHealingConfig {
  return activeConfig;
}
