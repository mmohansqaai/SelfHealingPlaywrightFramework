import type { Page } from '@playwright/test';
import type {
  AutonomousGovernanceRecord,
  AutonomousPlannedStep,
  AutonomousRunOptions,
  AutonomousRunResult,
  AutonomousStepTrace,
  AutonomousVerificationRecord,
  MaintenanceAgentResult,
} from 'autonomous-agent-contracts';
import {
  isAssertionAction,
  planAutonomousGoalAsync,
  planLlmRecoverySteps,
  replanAfterAssertionFailure,
  resolveAutonomousLlmProvider,
} from 'autonomous-test-agent';
import { estimateAutonomousRunCostUsd, isCostWithinCap } from './cost-estimator';
import { executeAutonomousStep } from './execute-step';
import { getAutonomousPageState, getAutonomousPageStateForPlanner } from './get-page-state';
import { enrichPageStateWithVision } from './vision-page-state';
import {
  assertPlannerAllowedForCi,
  injectSecretsIntoGoal,
  isDomainAllowed,
  resolveAutonomousGovernanceFromEnv,
  resolveAutonomousSecretsFromEnv,
} from './governance';
import { redactSecretsInText } from './redact-secrets';
import { runMaintenanceAgent } from '../maintenance/maintenance-agent';
import { assertDomainAllowed } from './strategies-for-hint';
import { runVerificationAgent, summarizeVerifications } from './verification-agent';
import { writeAutonomousReviewArtifact } from './human-review';

export type AutonomousRunWithMaintenance = {
  result: AutonomousRunResult;
  maintenance?: MaintenanceAgentResult;
};

/** Redact credentials only when sending goals to a real external LLM provider. */
function goalForAutonomousPlanner(
  resolvedGoal: string,
  secrets: ReturnType<typeof resolveAutonomousSecretsFromEnv>,
  plannerMode: 'mock' | 'llm'
): string {
  if (plannerMode === 'mock' || resolveAutonomousLlmProvider() === 'mock') {
    return resolvedGoal;
  }
  return redactSecretsInText(resolvedGoal, secrets);
}

function buildGovernanceRecord(
  params: {
    startedAt: number;
    status: AutonomousRunResult['status'];
    verificationPassed: boolean;
    plannerMode: 'mock' | 'llm';
    governance: ReturnType<typeof resolveAutonomousGovernanceFromEnv>;
    hostname: string;
    draft: Pick<AutonomousRunResult, 'stepsExecuted' | 'replanCount' | 'trace' | 'planner'>;
    destructiveActionsBlocked?: number;
  }
): AutonomousGovernanceRecord {
  const estimatedCostUsd = estimateAutonomousRunCostUsd(params.draft);
  const needsHumanReview =
    params.governance.humanReviewOnFailure &&
    (params.status === 'failed' || !params.verificationPassed || !isDomainAllowed(params.hostname, params.governance.allowedDomains));

  return {
    estimatedCostUsd,
    durationMs: Date.now() - params.startedAt,
    needsHumanReview,
    domainAllowed: isDomainAllowed(params.hostname, params.governance.allowedDomains),
    plannerModeUsed: params.plannerMode,
    costCapExceeded: !isCostWithinCap(estimatedCostUsd, params.governance.maxCostUsdPerRun),
    destructiveActionsBlocked: params.destructiveActionsBlocked ?? 0,
  };
}

/**
 * Phase 8–10 — run a Playwright journey from a natural-language goal (no pre-written locators).
 */
export async function runAutonomousTest(page: Page, options: AutonomousRunOptions): Promise<AutonomousRunResult> {
  const wrapped = await runAutonomousTestWithMaintenance(page, options);
  return wrapped.result;
}

export async function runAutonomousTestWithMaintenance(
  page: Page,
  options: AutonomousRunOptions
): Promise<AutonomousRunWithMaintenance> {
  const runStartedAt = Date.now();
  const governance = resolveAutonomousGovernanceFromEnv(options.governance ?? {});
  const secrets = options.secrets ?? resolveAutonomousSecretsFromEnv();
  const resolvedGoal = injectSecretsIntoGoal(options.goal, secrets);
  const plannerMode = options.plannerMode ?? (process.env.AUTONOMOUS_PLANNER === 'llm' ? 'llm' : 'mock');

  assertPlannerAllowedForCi(plannerMode, governance);

  const maxSteps = options.maxSteps ?? Number(process.env.AUTONOMOUS_MAX_STEPS || 25);
  const maxReplans = options.maxReplans ?? Number(process.env.AUTONOMOUS_MAX_REPLANS || 2);
  const healOnFailure = options.healOnFailure !== false;
  const timeoutPerActionMs = options.timeoutPerActionMs ?? 8_000;
  const allowedDomains = options.allowedDomains ?? governance.allowedDomains;

  if (options.startUrl) {
    await page.goto(options.startUrl, { waitUntil: 'domcontentloaded' });
    assertDomainAllowed(page, allowedDomains);
  }

  const pageStateForPlan =
    plannerMode === 'llm'
      ? await enrichPageStateWithVision(
          page,
          await getAutonomousPageStateForPlanner(page).catch(() => ({
            url: page.url(),
            title: '',
          }))
        )
      : undefined;

  const plan = await planAutonomousGoalAsync({
    goal: goalForAutonomousPlanner(resolvedGoal, secrets, plannerMode),
    plannerMode,
    startUrl: options.startUrl,
    pageState: pageStateForPlan,
  });

  const trace: AutonomousStepTrace[] = [];
  const verifications: AutonomousVerificationRecord[] = [];
  const completedStepIds: string[] = [];
  let stepsExecuted = 0;
  let replanCount = 0;
  let finalStatus: 'completed' | 'failed' = 'failed';
  let verificationDetail = 'Not verified';
  let destructiveActionsBlocked = 0;

  const queue: AutonomousPlannedStep[] = [...plan.steps];

  let stepCounter = 0;

  while (queue.length > 0 && stepsExecuted < maxSteps) {
    const step = queue.shift()!;
    const started = Date.now();
    const stepIndex = stepCounter++;

    if (step.action.type === 'complete') {
      const pageStateForVerify = await getAutonomousPageStateForPlanner(page).catch(() => ({
        url: page.url(),
        title: '',
      }));
      const traceWithComplete: AutonomousStepTrace[] = [
        ...trace,
        {
          stepIndex,
          stepId: step.id,
          action: step.action,
          ok: true,
          pageUrl: page.url(),
          durationMs: Date.now() - started,
          replanned: step.id.startsWith('replan-'),
        },
      ];
      const postChecks = await runVerificationAgent(page, resolvedGoal, {
        plannerMode,
        trace: traceWithComplete,
        pageState: pageStateForVerify,
        llmVerification: options.llmVerification,
      }).catch(() => []);
      verifications.push(...postChecks);
      trace.push({
        stepIndex,
        stepId: step.id,
        action: step.action,
        ok: true,
        pageUrl: page.url(),
        durationMs: Date.now() - started,
        replanned: step.id.startsWith('replan-'),
      });
      stepsExecuted++;
      const checksPassed = postChecks.every((c) => c.passed);
      finalStatus = checksPassed ? 'completed' : 'failed';
      verificationDetail = checksPassed
        ? step.action.message
        : `${step.action.message} (${summarizeVerifications(postChecks)})`;
      break;
    }

    if (step.action.type === 'fail') {
      trace.push({
        stepIndex,
        stepId: step.id,
        action: step.action,
        ok: false,
        error: step.action.reason,
        pageUrl: page.url(),
        durationMs: Date.now() - started,
      });
      stepsExecuted++;
      verificationDetail = step.action.reason;
      break;
    }

    const exec = await executeAutonomousStep(page, step, {
      healOnFailure,
      timeoutPerActionMs,
      allowedDomains,
      goal: resolvedGoal,
      allowDestructiveActions: options.allowDestructiveActions,
    });

    if (exec.destructiveBlocked) {
      destructiveActionsBlocked++;
    }

    const pageState = await getAutonomousPageState(page).catch(() => ({ url: page.url(), title: '' }));

    trace.push({
      stepIndex,
      stepId: step.id,
      action: step.action,
      ok: exec.ok,
      error: exec.error,
      pageUrl: pageState.url,
      healed: exec.healed,
      usedStrategy: exec.usedStrategy,
      healingSnapshot: exec.healingSnapshot,
      durationMs: Date.now() - started,
      replanned: step.id.startsWith('replan-'),
    });
    stepsExecuted++;

    if (exec.ok) {
      completedStepIds.push(step.id);
      if (step.action.type === 'assert_url') {
        verificationDetail = `URL check passed: ${page.url()}`;
      }
      continue;
    }

    if (!exec.ok && replanCount < maxReplans) {
      let recovery: AutonomousPlannedStep[] = [];

      if (plannerMode === 'llm' && process.env.AUTONOMOUS_LLM_REPLAN !== '0') {
        const pageStateForRecovery = await getAutonomousPageStateForPlanner(page).catch(() => ({
          url: page.url(),
          title: '',
        }));
        const llmRecovery = await planLlmRecoverySteps({
          goal: goalForAutonomousPlanner(resolvedGoal, secrets, 'llm'),
          plannerMode: 'llm',
          startUrl: options.startUrl,
          pageState: pageStateForRecovery,
          planKind: 'recovery',
          recoveryContext: {
            failedStepId: step.id,
            failedAction: step.action,
            error: exec.error,
            completedStepIds,
            recentTraceSummary: trace.slice(-6).map((t) => `${t.stepId} (${t.action.type}): ${t.ok ? 'ok' : t.error ?? 'fail'}`),
          },
        });
        recovery = llmRecovery.steps;
      } else if (isAssertionAction(step.action)) {
        recovery = replanAfterAssertionFailure({
          goal: resolvedGoal,
          failedStepId: step.id,
          failedAction: step.action,
          pageUrl: page.url(),
          completedStepIds,
        });
      }

      if (recovery.length > 0) {
        queue.unshift(...recovery);
        replanCount++;
        verificationDetail = `Replan ${replanCount}: recovering from failed ${step.id}`;
        continue;
      }
    }

    verificationDetail = exec.error ?? `Step ${step.id} failed`;
    break;
  }

  if (stepsExecuted >= maxSteps && finalStatus !== 'completed') {
    verificationDetail = `Step budget exhausted (${maxSteps})`;
  }

  let hostname = '';
  try {
    hostname = new URL(page.url()).hostname;
  } catch {
    hostname = '';
  }

  const draftResult = {
    stepsExecuted,
    replanCount,
    trace,
    planner: plan.planner,
  };

  const governanceRecord = buildGovernanceRecord({
    startedAt: runStartedAt,
    status: finalStatus,
    verificationPassed: finalStatus === 'completed',
    plannerMode,
    governance,
    hostname,
    draft: draftResult,
    destructiveActionsBlocked,
  });

  if (governanceRecord.costCapExceeded && finalStatus === 'completed') {
    finalStatus = 'failed';
    verificationDetail = `Run cost cap exceeded ($${governanceRecord.estimatedCostUsd.toFixed(4)} > $${governance.maxCostUsdPerRun})`;
    governanceRecord.needsHumanReview = true;
  }

  const result: AutonomousRunResult = {
    status: finalStatus,
    goal: resolvedGoal,
    journeyId: options.journeyId,
    planner: plan.planner,
    stepsExecuted,
    replanCount,
    trace,
    verifications,
    verification: {
      passed: finalStatus === 'completed',
      detail: verificationDetail,
    },
    reasoning: plan.reasoning,
    governance: governanceRecord,
  };

  if (
    finalStatus === 'completed' ||
    governanceRecord.needsHumanReview ||
    process.env.AUTONOMOUS_WRITE_REVIEW === '1'
  ) {
    writeAutonomousReviewArtifact(result);
  }

  return {
    result,
    maintenance:
      process.env.MAINTENANCE_AGENT === '1' || process.env.MAINTENANCE_AGENT === 'true'
        ? runMaintenanceAgent({
            status: finalStatus,
            goal: resolvedGoal,
            journeyId: options.journeyId,
            planner: plan.planner,
            stepsExecuted,
            replanCount,
            trace,
            verifications,
            verification: { passed: finalStatus === 'completed', detail: verificationDetail },
            reasoning: plan.reasoning,
            governance: governanceRecord,
          })
        : undefined,
  };
}

export function formatAutonomousTraceBody(result: AutonomousRunResult): string {
  const lines = [
    `Goal: ${result.goal}`,
    `Journey ID: ${result.journeyId ?? '(none)'}`,
    `Status: ${result.status}`,
    `Planner: ${result.planner}`,
    `Steps executed: ${result.stepsExecuted}`,
    `Replans: ${result.replanCount}`,
    `Est. cost (USD): $${result.governance.estimatedCostUsd.toFixed(4)}`,
    `Duration (ms): ${result.governance.durationMs}`,
    `Human review: ${result.governance.needsHumanReview ? 'REQUIRED' : 'not needed'}`,
    `Verification: ${result.verification.passed ? 'PASSED' : 'FAILED'} — ${result.verification.detail}`,
  ];

  if (result.verifications.length) {
    lines.push('', 'Verification agent:');
    for (const v of result.verifications) {
      lines.push(`  ${v.passed ? '✓' : '✗'} ${v.checkId} — ${v.detail}`);
    }
  }

  lines.push('', 'Trace:');

  for (const t of result.trace) {
    const mark = t.ok ? '✓' : '✗';
    const heal = t.healed ? ' [healed]' : '';
    const replan = t.replanned ? ' [replan]' : '';
    lines.push(
      `  ${mark} ${t.stepId} (${t.action.type})${heal}${replan} — ${t.usedStrategy ?? ''} ${t.error ?? ''}`.trim()
    );
    lines.push(`      url: ${t.pageUrl ?? ''} (${t.durationMs}ms)`);
  }

  return lines.join('\n');
}
