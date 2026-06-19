// Autonomous test agent (Nova retail QA)
export { runAutonomousTest, runAutonomousTestWithMaintenance, formatAutonomousTraceBody } from './autonomous/run-autonomous-test';
export type { AutonomousRunWithMaintenance } from './autonomous/run-autonomous-test';
export { executeAutonomousStep } from './autonomous/execute-step';
export { getAutonomousPageState, getAutonomousPageStateForPlanner } from './autonomous/get-page-state';
export { strategiesForHint, strategiesForHeading, strategiesForText, assertDomainAllowed } from './autonomous/strategies-for-hint';
export { runVerificationAgent, summarizeVerifications } from './autonomous/verification-agent';
export { runAutonomousSuite } from './autonomous/suite-runner';
export type { RunAutonomousSuiteOptions } from './autonomous/suite-runner';
export {
  runAutonomousEvaluation,
  formatAutonomousEvaluationBody,
} from './autonomous/evaluation-runner';
export type { AutonomousEvaluationResult, AutonomousEvaluationKpis, RunAutonomousEvaluationOptions } from './autonomous/evaluation-runner';
export { redactSecretsInText } from './autonomous/redact-secrets';
export {
  resolveAutonomousSecretsFromEnv,
  injectSecretsIntoGoal,
  resolveAutonomousGovernanceFromEnv,
  assertPlannerAllowedForCi,
  isDomainAllowed,
  goalUsesSecretPlaceholders,
} from './autonomous/governance';
export { estimateAutonomousRunCostUsd, isCostWithinCap } from './autonomous/cost-estimator';
export {
  buildAutonomousSuiteKpis,
  buildAutonomousSuiteResult,
  formatAutonomousSuiteKpisBody,
  buildAutonomousDashboardKpiDocument,
  writeAutonomousDashboardKpiDocument,
} from './autonomous/kpis';
export {
  isDestructiveAutonomousAction,
  goalExplicitlyAllowsDestructiveActions,
  isDestructiveActionAllowed,
  destructiveActionBlockedReason,
} from './autonomous/destructive-action-guard';
export { enrichPageStateWithVision, isAutonomousVisionEnabled } from './autonomous/vision-page-state';
export { generatePlaywrightSpecFromTrace } from './autonomous/trace-to-spec';
export { formatHumanReviewBody, writeAutonomousReviewArtifact } from './autonomous/human-review';
export type { AutonomousReviewArtifact } from './autonomous/human-review';

// Reporters
export { attachAutonomousTrace, attachAutonomousSuiteKpis, attachAutonomousHumanReview } from './reporters/autonomous-reporter';

// Re-export contracts + planner agent (convenience for Nova consumers)
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
  AutonomousSecrets,
  AutonomousGovernanceOptions,
  AutonomousGovernanceRecord,
  AutonomousSuiteKpis,
  AutonomousSuiteResult,
  AutonomousDashboardKpiDocument,
  AutonomousJourneyDefinition,
  MaintenanceHealingSnapshot,
  MaintenanceFailureRecord,
  MaintenancePersistenceProposal,
  MaintenanceTicketPayload,
  MaintenanceAgentOptions,
  MaintenanceAgentResult,
  MaintenanceTicketPublishResult,
  MaintenancePlannerHint,
  MaintenancePrBotResult,
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
  toHeldOutJourneyDefinitions,
  NOVA_RETAIL_HELD_OUT_JOURNEYS,
  resolveAutonomousLlmProvider,
  runLlmVerificationAgent,
  isLlmVerificationEnabled,
  mockLlmVerification,
  parseLlmVerificationJson,
  NOVA_RETAIL_EVALUATION_JOURNEYS,
  AUTONOMOUS_CI_SMOKE_JOURNEYS,
  AUTONOMOUS_GOAL_TEMPLATES,
} from 'autonomous-test-agent';
export type { EvaluationJourney } from 'autonomous-test-agent';

// Maintenance agent
export { runMaintenanceAgent, runMaintenanceAgentAsync, applyMaintenanceProposal } from './maintenance/maintenance-agent';
export { recordMaintenanceFailure, listMaintenanceFailures, maintenanceFailureStorePath } from './maintenance/failure-tracker';
export { createPersistenceProposal, writePersistenceProposal } from './maintenance/persistence-proposal';
export {
  extractPlannerHintsFromTrace,
  findProposalsForFailure,
  loadProposalsFromDir,
  collectMaintenanceRunContext,
} from './maintenance/maintenance-context';
export {
  approveMaintenanceProposal,
  listApprovedProposals,
  applyApprovedMaintenanceProposals,
  formatMaintenancePrBody,
  openMaintenanceDraftPr,
} from './maintenance/pr-bot';
export type { MaintenancePrBotOptions } from './maintenance/pr-bot';
export type { MaintenanceTicketContext } from './maintenance/ticket-payload';
export { buildMaintenanceTicket, writeMaintenanceTicket, formatJiraIssueFields, formatLinearIssueInput } from './maintenance/ticket-payload';
export { publishMaintenanceTicketsToJira } from './maintenance/ticket-publisher';
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
export { configureLocatorTargets, resetLocatorTargets, resolveLocatorTarget } from './maintenance/locator-resolver';
export type { LocatorTargetConfig } from './maintenance/locator-resolver';
export type { LocatorTargetMapping } from './maintenance/locator-types';
export { toHealingSnapshot, snapshotToCandidate } from './maintenance/locator-types';

// Healing persistence helpers (re-export for maintenance consumers)
export { previewPersistencePatch, buildStrategySnippetForCandidate } from 'ai-healing-sdk';
