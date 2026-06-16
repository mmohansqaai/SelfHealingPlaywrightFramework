import * as fs from 'node:fs';
import type {
  AutonomousRunResult,
  MaintenanceAgentOptions,
  MaintenanceAgentResult,
  MaintenancePersistenceProposal,
  MaintenanceTicketPayload,
} from 'autonomous-agent-contracts';
import { listMaintenanceFailures, recordMaintenanceFailure } from './failure-tracker';
import {
  collectMaintenanceRunContext,
  extractPlannerHintsFromTrace,
  findProposalsForFailure,
} from './maintenance-context';
import { createPersistenceProposal, writePersistenceProposal } from './persistence-proposal';
import { buildMaintenanceTicket, writeMaintenanceTicket } from './ticket-payload';
import { publishMaintenanceTicketsToJira } from './ticket-publisher';
import { persistGeneratedLocator } from '../core/persistence';
import { snapshotToCandidate } from './locator-target-map';

function targetHintFromStep(step: AutonomousRunResult['trace'][number]): string {
  const action = step.action;
  if (action.type === 'fill' || action.type === 'click' || action.type === 'assert_visible') {
    return action.targetHint;
  }
  if (action.type === 'assert_heading') return `heading ${action.textHint}`;
  if (action.type === 'assert_text') return `text ${action.textHint}`;
  return step.stepId;
}

function resolveMaintenanceOptions(options: MaintenanceAgentOptions = {}): Required<MaintenanceAgentOptions> {
  return {
    failureThreshold: options.failureThreshold ?? Number(process.env.MAINTENANCE_TICKET_THRESHOLD ?? 3),
    outputDir: options.outputDir ?? process.env.MAINTENANCE_OUTPUT_DIR ?? 'maintenance-output',
    ticketProvider:
      options.ticketProvider ??
      ((process.env.MAINTENANCE_TICKET_PROVIDER as 'jira' | 'linear' | 'mock') || 'mock'),
    proposePersistence: options.proposePersistence ?? process.env.MAINTENANCE_PROPOSE_PERSIST !== '0',
    publishTicketsLive:
      options.publishTicketsLive ??
      (process.env.MAINTENANCE_PUBLISH_JIRA === '1' || process.env.JIRA_PUBLISH_TICKETS === '1'),
  };
}

/** Phase 11 — analyze an autonomous run: track failures, propose locator patches, emit tickets. */
export function runMaintenanceAgent(
  result: AutonomousRunResult,
  options: MaintenanceAgentOptions = {}
): MaintenanceAgentResult {
  const opts = resolveMaintenanceOptions(options);
  const proposals: MaintenancePersistenceProposal[] = [];
  const tickets: MaintenanceTicketPayload[] = [];
  const runPlannerHints = extractPlannerHintsFromTrace(result.trace);
  const failureStorePath = process.env.MAINTENANCE_FAILURE_STORE ?? `${opts.outputDir}/.maintenance-failures.json`;

  for (const step of result.trace) {
    if (!step.ok) {
      const hint = targetHintFromStep(step);
      recordMaintenanceFailure({
        stepId: step.stepId,
        targetHint: hint,
        pageUrl: step.pageUrl ?? '',
        error: step.error,
        storePath: failureStorePath,
        plannerHints: runPlannerHints.filter(
          (h) =>
            h.stepId === step.stepId ||
            (h.targetHint && h.targetHint.toLowerCase() === hint.toLowerCase())
        ),
      });
    }

    if (opts.proposePersistence && step.healed && step.healingSnapshot) {
      const hint =
        step.action.type === 'fill' || step.action.type === 'click' || step.action.type === 'assert_visible'
          ? step.action.targetHint
          : step.stepId;
      const proposal = createPersistenceProposal({
        stepId: step.stepId,
        targetHint: hint,
        candidate: snapshotToCandidate(step.healingSnapshot),
      });
      if ('proposalId' in proposal) {
        writePersistenceProposal(proposal, `${opts.outputDir}/patches`);
        proposals.push(proposal);
      }
    }
  }

  const patchesDir = `${opts.outputDir}/patches`;
  const { allProposals } = collectMaintenanceRunContext(result, proposals, patchesDir);
  const repeatedFailures = listMaintenanceFailures(opts.failureThreshold, failureStorePath);
  for (const failure of repeatedFailures) {
    const linkedProposals = findProposalsForFailure(failure, allProposals);
    const ticket = buildMaintenanceTicket(failure, opts.ticketProvider, {
      linkedProposals,
      plannerHints: failure.plannerHints ?? runPlannerHints,
      outputDir: opts.outputDir,
    });
    writeMaintenanceTicket(ticket, `${opts.outputDir}/tickets`);
    tickets.push(ticket);
  }

  const summary = {
    runJourneyId: result.journeyId,
    runStatus: result.status,
    proposalsCount: proposals.length,
    ticketsCount: tickets.length,
    repeatedFailuresCount: repeatedFailures.length,
    processedAt: new Date().toISOString(),
  };
  fs.mkdirSync(opts.outputDir, { recursive: true });
  fs.writeFileSync(`${opts.outputDir}/maintenance-summary.json`, JSON.stringify(summary, null, 2), 'utf8');

  return {
    proposals,
    tickets,
    repeatedFailures,
    outputDir: opts.outputDir,
  };
}

/** Phase 11 — maintenance analysis + optional live Jira publish. */
export async function runMaintenanceAgentAsync(
  result: AutonomousRunResult,
  options: MaintenanceAgentOptions = {}
): Promise<MaintenanceAgentResult> {
  const maintenance = runMaintenanceAgent(result, options);
  const opts = resolveMaintenanceOptions(options);
  const shouldPublish = opts.publishTicketsLive && maintenance.tickets.length > 0;
  if (shouldPublish) {
    const publishResults = await publishMaintenanceTicketsToJira(maintenance.tickets, {
      publishTicketsLive: true,
    });
    return { ...maintenance, publishResults };
  }
  return maintenance;
}

/** Apply an approved persistence proposal after human PR review. */
export function applyMaintenanceProposal(
  proposalPath: string
): { ok: true; filePath: string; strategyName: string } | { ok: false; reason: string } {
  const raw = fs.readFileSync(proposalPath, 'utf8');
  const proposal = JSON.parse(raw) as MaintenancePersistenceProposal;
  const applied = persistGeneratedLocator({
    target: { filePath: proposal.targetFile, methodName: proposal.methodName },
    candidate: snapshotToCandidate(proposal.candidate),
    minConfidence: Number(process.env.MAINTENANCE_MIN_CONFIDENCE ?? 70),
    validationPasses: 2,
  });
  if (!applied.ok) return applied;
  return { ok: true, filePath: applied.filePath, strategyName: applied.strategyName };
}
