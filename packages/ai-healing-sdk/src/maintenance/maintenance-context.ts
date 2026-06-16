import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  AutonomousRunResult,
  AutonomousStepTrace,
  MaintenanceFailureRecord,
  MaintenancePersistenceProposal,
  MaintenancePlannerHint,
} from 'autonomous-agent-contracts';

function targetHintFromTraceStep(step: AutonomousStepTrace): string | undefined {
  const action = step.action;
  if (action.type === 'fill' || action.type === 'click' || action.type === 'assert_visible') {
    return action.targetHint;
  }
  if (action.type === 'assert_heading') return `heading ${action.textHint}`;
  if (action.type === 'assert_text') return `text ${action.textHint}`;
  return undefined;
}

/** Phase 15 — extract LLM replan / recovery hints from an autonomous run trace. */
export function extractPlannerHintsFromTrace(trace: AutonomousStepTrace[]): MaintenancePlannerHint[] {
  const hints: MaintenancePlannerHint[] = [];

  for (const step of trace) {
    const isReplan =
      step.replanned === true ||
      step.stepId.startsWith('replan-') ||
      step.stepId.startsWith('llm-replan-') ||
      step.stepId.startsWith('llm-step-');

    if (!isReplan && step.ok) continue;

    hints.push({
      stepId: step.stepId,
      targetHint: targetHintFromTraceStep(step),
      actionType: step.action.type,
      reasoning: step.error ? `Failed: ${step.error}` : step.usedStrategy ? `Healed via ${step.usedStrategy}` : undefined,
      replanned: isReplan,
      pageUrl: step.pageUrl,
    });
  }

  return hints;
}

/** Merge planner hints from the latest run into a failure record (dedupe by stepId). */
export function mergePlannerHints(
  existing: MaintenancePlannerHint[] | undefined,
  incoming: MaintenancePlannerHint[]
): MaintenancePlannerHint[] {
  const byStep = new Map<string, MaintenancePlannerHint>();
  for (const hint of existing ?? []) {
    byStep.set(hint.stepId, hint);
  }
  for (const hint of incoming) {
    byStep.set(hint.stepId, hint);
  }
  return [...byStep.values()].slice(-12);
}

export function hintsForFailure(
  failure: MaintenanceFailureRecord,
  runHints: MaintenancePlannerHint[]
): MaintenancePlannerHint[] {
  const related = runHints.filter(
    (h) =>
      h.stepId === failure.stepId ||
      (h.targetHint && h.targetHint.toLowerCase() === failure.targetHint.toLowerCase())
  );
  return mergePlannerHints(failure.plannerHints, related.length ? related : runHints.slice(-6));
}

/** Load proposal JSON files from maintenance output directory. */
export function loadProposalsFromDir(patchesDir: string): MaintenancePersistenceProposal[] {
  const dir = resolve(patchesDir);
  if (!existsSync(dir)) return [];

  const loaded: MaintenancePersistenceProposal[] = [];
  for (const f of readdirSync(dir).filter((name) => name.endsWith('.json') && !name.endsWith('-APPLY.json'))) {
    try {
      const proposal = JSON.parse(readFileSync(join(dir, f), 'utf8')) as MaintenancePersistenceProposal;
      if (typeof proposal.proposalId === 'string') {
        loaded.push({ ...proposal, proposalFilePath: join(dir, f) });
      }
    } catch {
      // skip invalid files
    }
  }
  return loaded;
}

export function findProposalsForFailure(
  failure: MaintenanceFailureRecord,
  proposals: MaintenancePersistenceProposal[]
): MaintenancePersistenceProposal[] {
  return proposals.filter(
    (p) =>
      p.stepId === failure.stepId ||
      p.targetHint.toLowerCase() === failure.targetHint.toLowerCase()
  );
}

export function collectMaintenanceRunContext(
  result: AutonomousRunResult,
  proposals: MaintenancePersistenceProposal[],
  patchesDir: string
): {
  runPlannerHints: MaintenancePlannerHint[];
  allProposals: MaintenancePersistenceProposal[];
} {
  const stored = loadProposalsFromDir(patchesDir);
  const byId = new Map<string, MaintenancePersistenceProposal>();
  for (const p of [...stored, ...proposals]) {
    byId.set(p.proposalId, p);
  }
  return {
    runPlannerHints: extractPlannerHintsFromTrace(result.trace),
    allProposals: [...byId.values()],
  };
}
