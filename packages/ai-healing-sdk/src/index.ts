// Phase 1 public API
export { enableHealing } from './wrappers/enable-healing';
export { healable } from './wrappers/healable';
export type { HealableClickOptions, HealableFillOptions, HealableApi } from './wrappers/healable';

export type {
  HealingSdkConfig,
  HealingEngineOptions,
  AutoHealEngineOptions,
  DomSnapshotMode,
  HealingAgentMode,
} from './utils/config';
export { DEFAULT_HEALING_SDK_CONFIG, resolveHealingSdkConfig, sdkConfigToEngineOptions } from './utils/config';

// Locator healing module
export * from './core/locator-healing';
export { hasSignal, failureHints } from './core/discovery/intent-hints';

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

// Transport (Phase 1 local; Phase 2 healing-service HTTP)
export { createLocalDiscoverer } from './transport/local-transport';
export type { DiscovererFn, LocalTransportOptions } from './transport/local-transport';
export { createHttpDiscoverer, isHealingServiceEnabled } from './transport/http-transport';
export type { HttpTransportOptions } from './transport/http-transport';
export { resolveDefaultDiscoverer } from './transport/resolve-discoverer';
export type { ResolveDiscovererOptions } from './transport/resolve-discoverer';
export type {
  HealingRequest,
  HealingResponse,
  HealingResponseCandidate,
  AgentHealContext,
  AgentTrace,
  AgentValidationResult,
  AgentToolCall,
} from './transport/contracts';
export { formatLocatorQuery, confidenceFromScore } from './transport/contracts';
export { discoverSeedCandidatesOffline } from './core/locator-recovery/offline-seed-discovery';

// Agentic healing (pure agent loop)
export { runAgenticHealingLoop, createAgentDiscoverer, resolveAgentDiscoverer } from './agent/agent-loop';
export type { AgentLoopOptions } from './agent/agent-loop';
export { runAgentEngine } from './agent/agent-engine';
export { buildHealingRequest } from './agent/build-healing-request';
export { searchDom, listHeuristicCandidates, listHeuristicCandidatesOffline } from './agent/tools';

// Telemetry
export { emitTelemetry, onTelemetry } from './telemetry/telemetry';
export type { TelemetryEvent } from './telemetry/telemetry';

// Interceptors
export { recordStrategyFailure, formatExhaustedStrategiesError } from './interceptors/failure-handler';

// Phase 8 — autonomous test agent
export { runAutonomousTest, runAutonomousTestWithMaintenance, formatAutonomousTraceBody } from './autonomous/run-autonomous-test';
export type { AutonomousRunWithMaintenance } from './autonomous/run-autonomous-test';
export { executeAutonomousStep } from './autonomous/execute-step';
export { getAutonomousPageState } from './autonomous/get-page-state';
export { strategiesForHint, strategiesForHeading, strategiesForText, assertDomainAllowed } from './autonomous/strategies-for-hint';
export { runVerificationAgent, summarizeVerifications } from './autonomous/verification-agent';
export { attachAutonomousTrace } from './reporters/healing-reporter';
export type {
  AutonomousAction,
  AutonomousPlannedStep,
  AutonomousPlanRequest,
  AutonomousPlanResponse,
  AutonomousRunOptions,
  AutonomousRunResult,
  AutonomousStepTrace,
  AutonomousPageState,
  AutonomousVerificationRecord,
  AutonomousReplanRequest,
} from 'autonomous-agent-contracts';
export {
  replanAfterAssertionFailure,
  isAssertionAction,
  planAutonomousGoal,
  planAutonomousGoalMock,
  planAutonomousGoalAsync,
  planAutonomousGoalWithLlm,
  planLlmRecoverySteps,
  parseLlmPlanJson,
  toEvaluationJourneyDefinitions,
  resolveAutonomousLlmProvider,
  NOVA_RETAIL_EVALUATION_JOURNEYS,
  AUTONOMOUS_CI_SMOKE_JOURNEYS,
  AUTONOMOUS_GOAL_TEMPLATES,
} from 'autonomous-test-agent';
export type { EvaluationJourney } from 'autonomous-test-agent';

// Phase 10 — production governance
export { runAutonomousSuite } from './autonomous/suite-runner';
export {
  runAutonomousEvaluation,
  formatAutonomousEvaluationBody,
} from './autonomous/evaluation-runner';
export type { AutonomousEvaluationResult, AutonomousEvaluationKpis, RunAutonomousEvaluationOptions } from './autonomous/evaluation-runner';
export { getAutonomousPageStateForPlanner } from './autonomous/get-page-state';
export { redactSecretsInText } from './autonomous/redact-secrets';
export type { RunAutonomousSuiteOptions } from './autonomous/suite-runner';
export {
  resolveAutonomousSecretsFromEnv,
  injectSecretsIntoGoal,
  resolveAutonomousGovernanceFromEnv,
  assertPlannerAllowedForCi,
  isDomainAllowed,
  goalUsesSecretPlaceholders,
} from './autonomous/governance';
export { estimateAutonomousRunCostUsd, isCostWithinCap } from './autonomous/cost-estimator';
export { buildAutonomousSuiteKpis, buildAutonomousSuiteResult, formatAutonomousSuiteKpisBody } from './autonomous/kpis';
export { generatePlaywrightSpecFromTrace } from './autonomous/trace-to-spec';
export { formatHumanReviewBody, writeAutonomousReviewArtifact } from './autonomous/human-review';
export type { AutonomousReviewArtifact } from './autonomous/human-review';
export { attachAutonomousSuiteKpis, attachAutonomousHumanReview } from './reporters/healing-reporter';
export type {
  AutonomousSecrets,
  AutonomousGovernanceOptions,
  AutonomousGovernanceRecord,
  AutonomousSuiteKpis,
  AutonomousSuiteResult,
  AutonomousJourneyDefinition,
  MaintenanceHealingSnapshot,
  MaintenanceFailureRecord,
  MaintenancePersistenceProposal,
  MaintenanceTicketPayload,
  MaintenanceAgentOptions,
  MaintenanceAgentResult,
  MaintenanceTicketPublishResult,
} from 'autonomous-agent-contracts';

// Phase 11 — maintenance agent
export { runMaintenanceAgent, runMaintenanceAgentAsync, applyMaintenanceProposal } from './maintenance/maintenance-agent';
export { recordMaintenanceFailure, listMaintenanceFailures, maintenanceFailureStorePath } from './maintenance/failure-tracker';
export { createPersistenceProposal, writePersistenceProposal } from './maintenance/persistence-proposal';
export { previewPersistencePatch, buildStrategySnippetForCandidate } from './core/persistence';
export { buildMaintenanceTicket, writeMaintenanceTicket, formatJiraIssueFields, formatLinearIssueInput } from './maintenance/ticket-payload';
export {
  publishMaintenanceTicketsToJira,
} from './maintenance/ticket-publisher';
export {
  resolveJiraConfigFromEnv,
  isJiraPublishEnabled,
  createJiraIssue,
  createJiraIssueFromTicket,
  createJiraIssueWithTypeFallback,
  resolveCiSummaryIssueTypes,
  buildJiraCreateIssueBody,
  maintenanceDescriptionToAdf,
} from './maintenance/jira-client';
export {
  publishAutonomousCiSummaryToJira,
  publishCiRunTicketEveryRun,
  writeCiRunContextForJira,
  readCiRunContextForJira,
  buildCiRunSummaryDescription,
  isCiSummaryPublishEnabled,
  resolveGithubActionsRunUrl,
} from './maintenance/jira-ci-summary';
export type { JiraClientConfig } from './maintenance/jira-client';
export { NOVA_RETAIL_LOCATOR_TARGETS, resolveLocatorTarget, toHealingSnapshot, snapshotToCandidate } from './maintenance/locator-target-map';
