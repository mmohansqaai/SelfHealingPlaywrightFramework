import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MaintenanceFailureRecord, MaintenanceTicketPayload } from 'autonomous-agent-contracts';

export function buildMaintenanceTicket(
  failure: MaintenanceFailureRecord,
  provider: MaintenanceTicketPayload['provider'] = 'mock'
): MaintenanceTicketPayload {
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
    '### Suggested actions',
    '',
    '1. Review `maintenance-patches/` for pending locator proposals',
    '2. Update page object strategies or autonomous planner hints',
    '3. Re-run `npm run test:autonomous-ci-smoke` after fix',
  ].join('\n');

  return {
    provider,
    title,
    description,
    labels: ['autonomous-qa', 'self-healing', 'locator-drift', failure.stepId],
    failure,
    createdAt: new Date().toISOString(),
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
