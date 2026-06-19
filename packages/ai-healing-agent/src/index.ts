export type { AgentMode, DriverHealingOptions } from './driver-healing-loop';
export { runDriverHealingLoop } from './driver-healing-loop';
export { runLocalAgentEngine, postHealRequest, searchDom, inferDomSearchFromHints } from './local-agent-engine';
export {
  discoverSeedCandidatesOffline,
  synthesizeCandidatesFromDomSnapshots,
  listHeuristicCandidatesOffline,
} from './offline-discovery';
export { failureHints, hasSignal } from './intent-hints';
