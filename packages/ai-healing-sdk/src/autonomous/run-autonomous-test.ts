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
import { isAssertionAction, planAutonomousGoalAsync, replanAfterAssertionFailure } from 'autonomous-test-agent';
import { estimateAutonomousRunCostUsd, isCostWithinCap } from './cost-estimator';
import { executeAutonomousStep } from './execute-step';
import { getAutonomousPageState } from './get-page-state';
import {
  assertPlannerAllowedForCi,
  injectSecretsIntoGoal,
  isDomainAllowed,
  resolveAutonomousGovernanceFromEnv,
  resolveAutonomousSecretsFromEnv,
} from './governance';
import { runMaintenanceAgent } from '../maintenance/maintenance-agent';
import { assertDomainAllowed } from './strategies-for-hint';
import { runVerificationAgent, summarizeVerifications } from './verification-agent';

export type AutonomousRunWithMaintenance = {
  result: AutonomousRunResult;
  maintenance?: MaintenanceAgentResult;
};

function buildGovernanceRecord(
  params: {
    startedAt: number;
    status: AutonomousRunResult['status'];
    verificationPassed: boolean;
    plannerMode: 'mock' | 'llm';
    governance: ReturnType<typeof resolveAutonomousGovernanceFromEnv>;
    hostname: string;
    draft: Pick<AutonomousRunResult, 'stepsExecuted' | 'replanCount' | 'trace' | 'planner'>;
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

  const plan = await planAutonomousGoalAsync({
    goal: resolvedGoal,
    plannerMode,
    startUrl: options.startUrl,
  });

  const trace: AutonomousStepTrace[] = [];
  const verifications: AutonomousVerificationRecord[] = [];
  const completedStepIds: string[] = [];
  let stepsExecuted = 0;
  let replanCount = 0;
  let finalStatus: 'completed' | 'failed' = 'failed';
  let verificationDetail = 'Not verified';

  const queue: AutonomousPlannedStep[] = [...plan.steps];

  if (options.startUrl) {
    await page.goto(options.startUrl, { waitUntil: 'domcontentloaded' });
    assertDomainAllowed(page, allowedDomains);
  }

  let stepCounter = 0;

  while (queue.length > 0 && stepsExecuted < maxSteps) {
    const step = queue.shift()!;
    const started = Date.now();
    const stepIndex = stepCounter++;

    if (step.action.type === 'complete') {
      const postChecks = await runVerificationAgent(page, resolvedGoal).catch(() => []);
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
    });

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

    if (isAssertionAction(step.action) && replanCount < maxReplans) {
      const recovery = replanAfterAssertionFailure({
        goal: resolvedGoal,
        failedStepId: step.id,
        failedAction: step.action,
        pageUrl: page.url(),
        completedStepIds,
      });

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
  });

  if (governanceRecord.costCapExceeded && finalStatus === 'completed') {
    finalStatus = 'failed';
    verificationDetail = `Run cost cap exceeded ($${governanceRecord.estimatedCostUsd.toFixed(4)} > $${governance.maxCostUsdPerRun})`;
    governanceRecord.needsHumanReview = true;
  }

  return {
    result: {
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
    },
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
