export type {
  GeneratedLocatorCandidate,
  HealingAttempt,
  HealingResult,
  LocatorStrategy,
  LocatorSource,
} from './healing-types';
export { attachHealingSummary, attachLiveAutoHealProof, formatHealingBody } from './healing-reporter';
export {
  discoverAutoHealingCandidates,
  discoverFromDomScan,
  discoverFromSeedRules,
  createDefaultDiscoverer,
  composeDiscoveryStrategies,
  isDomScanDiscoveryEnabled,
  resolveDiscoveryStrategyNames,
  generatedQueryKey,
  generatedQueryToLocatorFactory,
} from './auto-heal-discovery';
export type { AutoHealContext, DomElementSnapshot, ComposeDiscoveryOptions, DiscoveryStrategyName } from './auto-heal-discovery';
export { synthesizeCandidatesFromDomSnapshots } from './auto-heal-discovery';
export { historyFilePath, recordHistoryOutcome } from './auto-heal-history';
export { persistGeneratedLocator } from './auto-heal-persistence';
export {
  clickHealing,
  expectVisibleHealing,
  fillHealing,
  withHealingPage,
} from './self-healing';
