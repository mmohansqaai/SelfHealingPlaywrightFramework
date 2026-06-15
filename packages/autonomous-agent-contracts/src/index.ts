/** Phase 8 — autonomous agent shared contracts (SDK ↔ service ↔ planner). */

export type AutonomousAction =
  | { type: 'navigate'; url: string }
  | { type: 'fill'; targetHint: string; value: string }
  | { type: 'click'; targetHint: string }
  | { type: 'wait'; ms: number }
  | { type: 'assert_url'; mustNotMatch?: string; mustMatch?: string }
  | { type: 'assert_visible'; targetHint: string }
  | { type: 'assert_heading'; textHint: string }
  | { type: 'assert_text'; textHint: string }
  | { type: 'complete'; message: string }
  | { type: 'fail'; reason: string };

export type AutonomousPlannedStep = {
  id: string;
  action: AutonomousAction;
  reasoning: string;
};

export type AutonomousInteractiveElement = {
  tag: string;
  role?: string;
  label: string;
  inputType?: string;
};

export type AutonomousPageState = {
  url: string;
  title: string;
  domElementCount?: number;
  /** Phase 13 — compact DOM summary for LLM planner context. */
  interactiveElements?: AutonomousInteractiveElement[];
};

export type AutonomousLlmRecoveryContext = {
  failedStepId: string;
  failedAction: AutonomousAction;
  error?: string;
  completedStepIds: string[];
  recentTraceSummary?: string[];
};

export type AutonomousPlanRequest = {
  goal: string;
  plannerMode?: 'mock' | 'llm';
  startUrl?: string;
  /** Phase 13 — current page snapshot for LLM planning. */
  pageState?: AutonomousPageState;
  planKind?: 'initial' | 'recovery';
  recoveryContext?: AutonomousLlmRecoveryContext;
};

export type AutonomousPlanResponse = {
  goal: string;
  planner: string;
  steps: AutonomousPlannedStep[];
  reasoning: string;
};

export type AutonomousRunOptions = {
  goal: string;
  maxSteps?: number;
  /** Max assertion-failure replans (Phase 9). Default 2. */
  maxReplans?: number;
  allowedDomains?: string[];
  startUrl?: string;
  plannerMode?: 'mock' | 'llm';
  /** Enable agentic heal_locator on action failure. Default true. */
  healOnFailure?: boolean;
  timeoutPerActionMs?: number;
  /** Phase 10 — governance overrides (merged with env). */
  governance?: AutonomousGovernanceOptions;
  /** Phase 10 — inject credentials from env instead of embedding in goal text. */
  secrets?: AutonomousSecrets;
  /** Optional run label for suite KPIs / review artifacts. */
  journeyId?: string;
};

/** Credentials injected at runtime — never embed real secrets in committed goal strings. */
export type AutonomousSecrets = {
  customerEmail?: string;
  customerPassword?: string;
};

/** Phase 10 — production governance knobs. */
export type AutonomousGovernanceOptions = {
  allowedDomains?: string[];
  maxCostUsdPerRun?: number;
  maxCostUsdPerSuite?: number;
  /** When true (default in CI), reject llm planner mode. */
  requireMockPlannerInCi?: boolean;
  /** Flag failed runs for human review. Default true. */
  humanReviewOnFailure?: boolean;
};

export type AutonomousGovernanceRecord = {
  estimatedCostUsd: number;
  durationMs: number;
  needsHumanReview: boolean;
  domainAllowed: boolean;
  plannerModeUsed: 'mock' | 'llm';
  costCapExceeded: boolean;
};

export type AutonomousSuiteKpis = {
  journeyCount: number;
  completedCount: number;
  failedCount: number;
  goalCompletionRate: number;
  avgStepsExecuted: number;
  avgReplans: number;
  totalEstimatedCostUsd: number;
  avgEstimatedCostUsd: number;
  needsHumanReviewCount: number;
  failedJourneyIds: string[];
};

export type AutonomousSuiteResult = {
  results: AutonomousRunResult[];
  kpis: AutonomousSuiteKpis;
  suiteCostCapExceeded: boolean;
};

export type AutonomousJourneyDefinition = {
  id: string;
  goal: string;
  startUrl?: string;
  maxSteps?: number;
  timeoutPerActionMs?: number;
};

/** Phase 11 — maintenance agent shared types. */
export type MaintenanceHealingSnapshot = {
  strategyName: string;
  score: number;
  reason: string;
  query: { type: 'css' | 'role'; value?: string; role?: string; name?: string };
};

export type MaintenanceFailureRecord = {
  id: string;
  stepId: string;
  targetHint: string;
  pageUrl: string;
  failureCount: number;
  lastError?: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type MaintenancePersistenceProposal = {
  proposalId: string;
  stepId: string;
  targetHint: string;
  targetFile: string;
  methodName: string;
  candidate: MaintenanceHealingSnapshot;
  patchSnippet: string;
  status: 'pending_review';
  createdAt: string;
};

export type MaintenanceTicketPayload = {
  provider: 'jira' | 'linear' | 'mock';
  title: string;
  description: string;
  labels: string[];
  failure: MaintenanceFailureRecord;
  createdAt: string;
};

export type MaintenanceAgentOptions = {
  failureThreshold?: number;
  outputDir?: string;
  ticketProvider?: 'jira' | 'linear' | 'mock';
  proposePersistence?: boolean;
  /** When true (or JIRA_* env set), publish tickets to live Jira after file write. */
  publishTicketsLive?: boolean;
};

export type MaintenanceTicketPublishResult = {
  provider: 'jira' | 'linear' | 'mock';
  published: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  failureId: string;
};

export type MaintenanceAgentResult = {
  proposals: MaintenancePersistenceProposal[];
  tickets: MaintenanceTicketPayload[];
  repeatedFailures: MaintenanceFailureRecord[];
  outputDir: string;
  publishResults?: MaintenanceTicketPublishResult[];
};

export type AutonomousStepTrace = {
  stepIndex: number;
  stepId: string;
  action: AutonomousAction;
  ok: boolean;
  error?: string;
  pageUrl?: string;
  healed?: boolean;
  usedStrategy?: string;
  durationMs: number;
  /** True when this step was injected by replan after assertion failure. */
  replanned?: boolean;
  /** Phase 11 — healed locator candidate snapshot for maintenance proposals. */
  healingSnapshot?: MaintenanceHealingSnapshot;
};

export type AutonomousVerificationRecord = {
  checkId: string;
  passed: boolean;
  detail: string;
};

export type AutonomousReplanRequest = {
  goal: string;
  failedStepId: string;
  failedAction: AutonomousAction;
  pageUrl: string;
  completedStepIds: string[];
};

export type AutonomousRunResult = {
  status: 'completed' | 'failed';
  goal: string;
  journeyId?: string;
  planner: string;
  stepsExecuted: number;
  replanCount: number;
  trace: AutonomousStepTrace[];
  verifications: AutonomousVerificationRecord[];
  verification: { passed: boolean; detail: string };
  reasoning: string;
  governance: AutonomousGovernanceRecord;
};
