export type {
  GeneratedLocatorCandidate,
  HealingAttempt,
  HealingResult,
  LocatorStrategy,
  LocatorSource,
} from './healing-types';
export { attachHealingSummary, attachLiveAutoHealProof, formatHealingBody } from './healing-reporter';
export { discoverAutoHealingCandidates } from './auto-heal-discovery';
export { historyFilePath, recordHistoryOutcome } from './auto-heal-history';
export { persistGeneratedLocator } from './auto-heal-persistence';
export {
  clickHealing,
  expectVisibleHealing,
  fillHealing,
  withHealingPage,
} from './self-healing';
