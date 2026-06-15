import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MaintenanceTicketPayload, MaintenanceTicketPublishResult } from 'autonomous-agent-contracts';
import { createJiraIssueFromTicket, isJiraPublishEnabled, resolveJiraConfigFromEnv } from './jira-client';

type PublishedStore = Record<string, { issueKey: string; issueUrl: string; publishedAt: string }>;

function publishedStorePath(custom?: string): string {
  return resolve(process.cwd(), custom ?? process.env.MAINTENANCE_JIRA_PUBLISHED_STORE ?? '.maintenance-jira-published.json');
}

function readPublishedStore(path: string): PublishedStore {
  if (!existsSync(path)) return {};
  try {
    return (JSON.parse(readFileSync(path, 'utf8')) as PublishedStore) ?? {};
  } catch {
    return {};
  }
}

function writePublishedStore(path: string, store: PublishedStore): void {
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
}

/** Publish maintenance tickets to Jira Cloud (skips already-published failure IDs). */
export async function publishMaintenanceTicketsToJira(
  tickets: MaintenanceTicketPayload[],
  options?: { publishTicketsLive?: boolean; dedupe?: boolean }
): Promise<MaintenanceTicketPublishResult[]> {
  if (!isJiraPublishEnabled(options)) {
    return tickets.map((t) => ({
      provider: 'jira' as const,
      published: false,
      failureId: t.failure.id,
      error: 'Jira publish disabled or JIRA_* env not configured',
    }));
  }

  const config = resolveJiraConfigFromEnv();
  if (!config) {
    return tickets.map((t) => ({
      provider: 'jira' as const,
      published: false,
      failureId: t.failure.id,
      error: 'Missing JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, or JIRA_PROJECT_KEY',
    }));
  }

  const dedupe = options?.dedupe !== false;
  const storePath = publishedStorePath();
  const store = dedupe ? readPublishedStore(storePath) : {};
  const results: MaintenanceTicketPublishResult[] = [];

  for (const ticket of tickets) {
    if (ticket.provider !== 'jira' && ticket.provider !== 'mock') {
      results.push({
        provider: ticket.provider,
        published: false,
        failureId: ticket.failure.id,
        error: `Provider ${ticket.provider} live publish not implemented`,
      });
      continue;
    }

    const existing = store[ticket.failure.id];
    if (existing) {
      results.push({
        provider: 'jira',
        published: true,
        failureId: ticket.failure.id,
        externalId: existing.issueKey,
        externalUrl: existing.issueUrl,
      });
      continue;
    }

    const created = await createJiraIssueFromTicket(config, { ...ticket, provider: 'jira' });
    if (!created.ok) {
      results.push({
        provider: 'jira',
        published: false,
        failureId: ticket.failure.id,
        error: created.error,
      });
      continue;
    }

    store[ticket.failure.id] = {
      issueKey: created.issueKey,
      issueUrl: created.issueUrl,
      publishedAt: new Date().toISOString(),
    };
    writePublishedStore(storePath, store);

    results.push({
      provider: 'jira',
      published: true,
      failureId: ticket.failure.id,
      externalId: created.issueKey,
      externalUrl: created.issueUrl,
    });
  }

  return results;
}
