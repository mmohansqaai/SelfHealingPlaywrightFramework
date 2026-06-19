import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  MaintenanceFailureRecord,
  MaintenancePersistenceProposal,
  MaintenancePlannerHint,
  MaintenanceTicketPayload,
} from 'autonomous-agent-contracts';

export type MaintenanceTicketContext = {
  linkedProposals?: MaintenancePersistenceProposal[];
  plannerHints?: MaintenancePlannerHint[];
  outputDir?: string;
};

function formatPlannerHintsSection(hints: MaintenancePlannerHint[]): string {
  if (!hints.length) return '';
  const lines = hints.map((h) => {
    const parts = [
      `- **${h.stepId}** (${h.actionType})${h.replanned ? ' [replan]' : ''}`,
      h.targetHint ? `  - hint: \`${h.targetHint}\`` : '',
      h.pageUrl ? `  - url: ${h.pageUrl}` : '',
      h.reasoning ? `  - note: ${h.reasoning}` : '',
    ];
    return parts.filter(Boolean).join('\n');
  });
  return ['### LLM replan / recovery hints', '', ...lines, ''].join('\n');
}

function formatLinkedProposalsSection(proposals: MaintenancePersistenceProposal[], outputDir?: string): string {
  if (!proposals.length) return '';
  const blocks = proposals.map((p) => {
    const relPath = p.proposalFilePath ?? `${outputDir ?? 'maintenance-output'}/patches/${p.proposalId}.json`;
    return [
      `#### Proposal \`${p.proposalId}\` (${p.status})`,
      '',
      `- Target: \`${p.targetFile}#${p.methodName}\``,
      `- Step: \`${p.stepId}\` — ${p.targetHint}`,
      `- Strategy: \`${p.candidate.strategyName}\` (score ${p.candidate.score})`,
      `- File: \`${relPath}\``,
      '',
      '```typescript',
      p.patchSnippet,
      '```',
      '',
      'Approve locally:',
      '',
      '```bash',
      `npm run maintenance:approve -- ${relPath}`,
      'npm run maintenance:open-pr',
      '```',
      '',
    ].join('\n');
  });
  return ['### Linked locator proposals', '', ...blocks].join('\n');
}

export function buildMaintenanceTicket(
  failure: MaintenanceFailureRecord,
  provider: MaintenanceTicketPayload['provider'] = 'mock',
  context: MaintenanceTicketContext = {}
): MaintenanceTicketPayload {
  const linkedProposals = context.linkedProposals ?? [];
  const plannerHints = context.plannerHints ?? failure.plannerHints ?? [];
  const title = `[Autonomous QA] Repeated failure: ${failure.stepId} (${failure.targetHint})`;
  const description = [
    '## Autonomous test maintenance ticket',
    '',
    'A Playwright autonomous step has failed repeatedly and may need locator or flow updates.',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Step ID | ${failure.stepId} |`,
    `| Target hint | ${failure.targetHint} |`,
    `| Page URL | ${failure.pageUrl} |`,
    `| Failure count | ${failure.failureCount} |`,
    `| First seen | ${failure.firstSeenAt} |`,
    `| Last seen | ${failure.lastSeenAt} |`,
    '',
    '### Last error',
    '',
    '```',
    failure.lastError ?? '(none recorded)',
    '```',
    '',
    formatPlannerHintsSection(plannerHints),
    formatLinkedProposalsSection(linkedProposals, context.outputDir),
    '### Suggested actions',
    '',
    linkedProposals.length
      ? '1. Review linked locator proposals above and approve with `npm run maintenance:approve`'
      : '1. Review `maintenance-output/patches/` for pending locator proposals',
    '2. Open a draft PR with `npm run maintenance:open-pr` after approval',
    '3. Update page object strategies or autonomous planner hints',
    '4. Re-run `npm run test:autonomous-ci-smoke` after fix',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    provider,
    title,
    description,
    labels: ['autonomous-qa', 'self-healing', 'locator-drift', failure.stepId],
    failure,
    createdAt: new Date().toISOString(),
    linkedProposals: linkedProposals.length ? linkedProposals : undefined,
    plannerHints: plannerHints.length ? plannerHints : undefined,
  };
}

export function writeMaintenanceTicket(
  ticket: MaintenanceTicketPayload,
  outputDir = process.env.MAINTENANCE_TICKET_DIR ?? 'maintenance-tickets'
): string {
  const dir = path.resolve(outputDir);
  fs.mkdirSync(dir, { recursive: true });
  const safeId = ticket.failure.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const filePath = path.join(dir, `${ticket.provider}-${safeId}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(ticket, null, 2), 'utf8');
  return filePath;
}

export function formatJiraIssueFields(ticket: MaintenanceTicketPayload): Record<string, unknown> {
  return {
    fields: {
      summary: ticket.title,
      description: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: ticket.description }] }],
      },
      labels: ticket.labels,
    },
  };
}

export function formatLinearIssueInput(ticket: MaintenanceTicketPayload, teamId: string): Record<string, unknown> {
  return {
    teamId,
    title: ticket.title,
    description: ticket.description,
    labelIds: ticket.labels,
  };
}
