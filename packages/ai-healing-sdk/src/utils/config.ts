import type { DiscoveryStrategyName } from '../core/discovery/compose-discoverers';
import type { HealingActionType } from '../core/healing-types';
import type { DiscovererFn } from '../transport/local-transport';
import { envTruthy } from './env';

export type DomSnapshotMode = 'full' | 'minimal' | 'off';

/** Phase 1 SDK configuration (maps to existing healing engine options). */
export type HealingSdkConfig = {
  healingEnabled: boolean;
  maxRetries: number;
  confidenceThreshold: number;
  screenshotOnFailure: boolean;
  domSnapshotMode: DomSnapshotMode;
  persistenceEnabled: boolean;
  telemetryEnabled: boolean;
  verboseLogs: boolean;
  timeoutPerStrategyMs: number;
  discoveryStrategies?: DiscoveryStrategyName[];
};

const DEFAULT_MIN_CONFIDENCE = 0.7;

export const DEFAULT_HEALING_SDK_CONFIG: HealingSdkConfig = {
  healingEnabled: envTruthy(process.env.AUTO_HEAL_DISCOVER),
  maxRetries: 3,
  confidenceThreshold: Number(process.env.AUTO_HEAL_MIN_CONFIDENCE)
    ? Number(process.env.AUTO_HEAL_MIN_CONFIDENCE) / 100
    : DEFAULT_MIN_CONFIDENCE,
  screenshotOnFailure: true,
  domSnapshotMode: envTruthy(process.env.AUTO_HEAL_DOM_SCAN) === false ? 'off' : 'full',
  persistenceEnabled: envTruthy(process.env.AUTO_HEAL_PERSIST),
  telemetryEnabled: true,
  verboseLogs: envTruthy(process.env.AUTO_HEAL_VERBOSE),
  timeoutPerStrategyMs: 5_000,
};

export function resolveHealingSdkConfig(partial?: Partial<HealingSdkConfig>): HealingSdkConfig {
  return { ...DEFAULT_HEALING_SDK_CONFIG, ...partial };
}

export type AutoHealEngineOptions = {
  enabled?: boolean;
  discoverOnly?: boolean;
  minConfidence?: number;
  persistTarget?: { filePath: string; methodName: string };
  validationPasses?: number;
  discoveryStrategies?: DiscoveryStrategyName[];
  discoverer?: DiscovererFn;
};

export type HealingEngineOptions = {
  timeoutPerStrategyMs?: number;
  actionType?: HealingActionType;
  autoHeal?: AutoHealEngineOptions;
};

/** Map SDK config into engine-level healing options. */
export function sdkConfigToEngineOptions(
  config: HealingSdkConfig,
  overrides?: Partial<HealingEngineOptions>
): HealingEngineOptions {
  const discoveryStrategies =
    config.domSnapshotMode === 'off'
      ? (['seed'] as DiscoveryStrategyName[])
      : config.discoveryStrategies;

  return {
    timeoutPerStrategyMs: config.timeoutPerStrategyMs,
    ...overrides,
    autoHeal: {
      enabled: config.healingEnabled,
      discoverOnly: !config.persistenceEnabled,
      minConfidence: Math.round(config.confidenceThreshold * 100),
      validationPasses: 2,
      discoveryStrategies,
      ...overrides?.autoHeal,
    },
  };
}
