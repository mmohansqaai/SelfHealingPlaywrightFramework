/**
 * Backward-compatible entry point for auto-heal discovery.
 * Implementation is split under `core/discovery/` by strategy.
 */
export type { AutoHealContext } from './discovery/types';
export { discoverFromSeedRules, seedDiscoveryStrategy } from './discovery/seed-discovery';
export {
  discoverFromDomScan,
  domScanDiscoveryStrategy,
  scanDomElements,
  synthesizeCandidatesFromDomSnapshots,
} from './discovery/dom-scan-discovery';
export type { DomElementSnapshot } from './discovery/dom-scan-discovery';
export {
  composeDiscoveryStrategies,
  createDefaultDiscoverer,
  discoverAutoHealingCandidates,
  isDomScanDiscoveryEnabled,
  resolveDiscoveryStrategyNames,
} from './discovery/compose-discoverers';
export type { ComposeDiscoveryOptions, DiscoveryStrategyName } from './discovery/compose-discoverers';
export { generatedQueryKey, generatedQueryToLocatorFactory } from './locator-query';
