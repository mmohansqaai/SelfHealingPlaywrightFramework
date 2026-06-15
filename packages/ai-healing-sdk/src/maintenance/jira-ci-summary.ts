import type {
  AutonomousSuiteResult,
  MaintenanceAgentResult,
  MaintenanceTicketPublishResult,
} from 'autonomous-agent-contracts';
import { formatAutonomousSuiteKpisBody } from '../autonomous/kpis';
import { createJiraIssue, isJiraPublishEnabled, resolveJiraConfigFromEnv } from './jira-client';

export function isCiSummaryPublishEnabled(): boolean {
  if (process.env.MAINTENANCE_PUBLISH_CI_SUMMARY === '0') return false;
  if (process.env.MAINTENANCE_PUBLISH_CI_SUMMARY === '1') return isJiraPublishEnabled({ publishTicketsLive: true });
  // Default: publish run summary when live Jira is enabled in CI
  return process.env.CI === 'true' && process.env.MAINTENANCE_PUBLISH_JIRA === '1' && isJiraPublishEnabled({ publishTicketsLive: true });
}

export function buildCiRunSummaryDescription(
  suite: AutonomousSuiteResult,
  maintenanceResults: MaintenanceAgentResult[] = [],
  meta: { runUrl?: string; sha?: string } = {}
): string {
  const status = suite.kpis.failedCount === 0 && !suite.suiteCostCapExceeded ? 'PASS' : 'FAIL';
  const totalProposals = maintenanceResults.reduce((n, m) => n + m.proposals.length, 0);
  const totalMaintenanceTickets = maintenanceResults.reduce((n, m) => n + m.tickets.length, 0);
  const publishedCount = maintenanceResults.reduce(
    (n, m) => n + (m.publishResults?.filter((r) => r.published).length ?? 0),
    0
  );

  const lines = [
    '## Autonomous QA — CI run summary',
    '',
    `Status: **${status}**`,
    meta.sha ? `Commit: ${meta.sha}` : '',
    meta.runUrl ? `Workflow run: ${meta.runUrl}` : '',
    '',
    formatAutonomousSuiteKpisBody(suite.kpis),
    '',
    '### Maintenance',
    '',
    `- Locator proposals: ${totalProposals}`,
    `- Repeated-failure tickets (local): ${totalMaintenanceTickets}`,
    `- Jira issues published (maintenance): ${publishedCount}`,
    '',
    '### Note',
    '',
    'Maintenance bug tickets are created only after the same step fails repeatedly (see MAINTENANCE_TICKET_THRESHOLD).',
    'This issue is the per-run CI summary.',
  ].filter(Boolean);

  return lines.join('\n');
}

/** Post a Jira issue summarizing each autonomous CI run (independent of failure tickets). */
export async function publishAutonomousCiSummaryToJira(
  suite: AutonomousSuiteResult,
  maintenanceResults: MaintenanceAgentResult[] = [],
  meta: { runUrl?: string; sha?: string; runId?: string } = {}
): Promise<MaintenanceTicketPublishResult | null> {
  if (!isCiSummaryPublishEnabled()) return null;

  const config = resolveJiraConfigFromEnv();
  if (!config) {
    return {
      provider: 'jira',
      published: false,
      failureId: `ci-run-summary-${meta.runId ?? 'local'}`,
      error: 'Missing JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, or JIRA_PROJECT_KEY',
    };
  }

  const status = suite.kpis.failedCount === 0 && !suite.suiteCostCapExceeded ? 'PASS' : 'FAIL';
  const date = new Date().toISOString().slice(0, 10);
  const summary = `[Autonomous QA] CI ${status} — ${date} (${suite.kpis.completedCount}/${suite.kpis.journeyCount} journeys)`;
  const description = buildCiRunSummaryDescription(suite, maintenanceResults, meta);
  const issueType = process.env.JIRA_CI_SUMMARY_ISSUE_TYPE ?? 'Task';

  const created = await createJiraIssue(config, {
    summary,
    description,
    issueType,
    labels: ['autonomous-qa', 'ci-summary', status.toLowerCase()],
  });

  if (!created.ok) {
    return {
      provider: 'jira',
      published: false,
      failureId: `ci-run-summary-${meta.runId ?? 'local'}`,
      error: created.error,
    };
  }

  return {
    provider: 'jira',
    published: true,
    failureId: `ci-run-summary-${meta.runId ?? 'local'}`,
    externalId: created.issueKey,
    externalUrl: created.issueUrl,
  };
}

export function resolveGithubActionsRunUrl(): string | undefined {
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!server || !repo || !runId) return undefined;
  return `${server}/${repo}/actions/runs/${runId}`;
}
