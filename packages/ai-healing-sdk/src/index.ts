// Phase 1 public API
export { enableHealing } from './wrappers/enable-healing';
export { healable } from './wrappers/healable';
export type { HealableClickOptions, HealableFillOptions, HealableApi } from './wrappers/healable';

export type {
  HealingSdkConfig,
  HealingEngineOptions,
  AutoHealEngineOptions,
  DomSnapshotMode,
} from './utils/config';
export { DEFAULT_HEALING_SDK_CONFIG, resolveHealingSdkConfig, sdkConfigToEngineOptions } from './utils/config';

// Locator healing module
export * from './core/locator-healing';

// Core types
export type {
  GeneratedLocatorCandidate,
  GeneratedLocatorQuery,
  HealingAttempt,
  HealingResult,
  LocatorStrategy,
  LocatorSource,
  HealingActionType,
} from './core/healing-types';

// Retry orchestrator (backward-compatible engine API)
export {
  withHealingPage,
  clickHealing,
  fillHealing,
  expectVisibleHealing,
} from './retry/retry-orchestrator';
export type { HealingOptions, AutoHealOptions } from './retry/retry-orchestrator';

// Persistence & history
export { persistGeneratedLocator, resolveRelativePagePath } from './core/persistence';
export type { PersistOptions, PersistTarget } from './core/persistence';
export { historyFilePath, recordHistoryOutcome, getHistoryWeight } from './core/history';

// Reporters
export { attachHealingSummary, attachLiveAutoHealProof, formatHealingBody } from './reporters/healing-reporter';

// Transport (Phase 1 local; Phase 2 remote)
export { createLocalDiscoverer } from './transport/local-transport';
export type { DiscovererFn, LocalTransportOptions } from './transport/local-transport';

// Telemetry
export { emitTelemetry, onTelemetry } from './telemetry/telemetry';
export type { TelemetryEvent } from './telemetry/telemetry';

// Interceptors
export { recordStrategyFailure, formatExhaustedStrategiesError } from './interceptors/failure-handler';
