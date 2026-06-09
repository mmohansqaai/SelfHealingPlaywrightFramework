/**
 * Backward-compatible entry point for auto-heal discovery.
 * Implementation lives in ai-healing-sdk.
 */
export type { AutoHealContext } from '../packages/ai-healing-sdk/src/core/discovery/types';
export { discoverFromSeedRules, seedDiscoveryStrategy } from '../packages/ai-healing-sdk/src/core/discovery/seed-discovery';
export {
  discoverFromDomScan,
  domScanDiscoveryStrategy,
  scanDomElements,
  synthesizeCandidatesFromDomSnapshots,
} from '../packages/ai-healing-sdk/src/core/discovery/dom-scan-discovery';
export type { DomElementSnapshot } from '../packages/ai-healing-sdk/src/core/discovery/dom-scan-discovery';
export {
  composeDiscoveryStrategies,
  createDefaultDiscoverer,
  discoverAutoHealingCandidates,
  isDomScanDiscoveryEnabled,
  resolveDiscoveryStrategyNames,
} from '../packages/ai-healing-sdk/src/core/discovery/compose-discoverers';
export type { ComposeDiscoveryOptions, DiscoveryStrategyName } from '../packages/ai-healing-sdk/src/core/discovery/compose-discoverers';
export { generatedQueryKey, generatedQueryToLocatorFactory } from '../packages/ai-healing-sdk/src/core/locator-query';
