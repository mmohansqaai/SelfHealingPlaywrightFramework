import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  AutonomousSuiteResult,
  MaintenanceAgentResult,
  MaintenanceTicketPublishResult,
} from 'autonomous-agent-contracts';
import { formatAutonomousSuiteKpisBody } from '../autonomous/kpis';
import { createJiraIssueWithTypeFallback, isJiraPublishEnabled, resolveJiraConfigFromEnv } from './jira-client';

export type CiRunContextFile = {
  suite?: AutonomousSuiteResult;
  maintenanceResults?: MaintenanceAgentResult[];
  sha?: string;
  runId?: string;
  runUrl?: string;
  workflowStatus?: string;
  writtenAt: string;
};

export function ciRunContextPath(outputDir = process.env.MAINTENANCE_OUTPUT_DIR ?? 'maintenance-output'): string {
  return resolve(process.cwd(), outputDir, 'ci-run-context.json');
}

export function writeCiRunContextForJira(
  payload: Omit<CiRunContextFile, 'writtenAt'>,
  outputDir?: string
): string {
  const path = ciRunContextPath(outputDir);
  mkdirSync(resolve(path, '..'), { recursive: true });
  const body: CiRunContextFile = { ...payload, writtenAt: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(body, null, 2), 'utf8');
  return path;
}

export function readCiRunContextForJira(outputDir?: string): CiRunContextFile | null {
  const path = ciRunContextPath(outputDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as CiRunContextFile;
  } catch {
    return null;
  }
}

export function isCiSummaryPublishEnabled(): boolean {
  if (process.env.MAINTENANCE_PUBLISH_CI_SUMMARY === '0') return false;
  if (process.env.JIRA_PUBLISH_EVERY_RUN === '1') return true;
  if (process.env.MAINTENANCE_PUBLISH_JIRA === '1') return true;
  return process.env.CI === 'true' && isJiraPublishEnabled({ publishTicketsLive: true });
}

export function buildCiRunSummaryDescription(
  suite: AutonomousSuiteResult,
  maintenanceResults: MaintenanceAgentResult[] = [],
  meta: { runUrl?: string; sha?: string; workflowStatus?: string } = {}
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
    meta.workflowStatus ? `Workflow job status: ${meta.workflowStatus}` : '',
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
  ].filter(Boolean);

  return lines.join('\n');
}

function mapWorkflowStatusToPassFail(status?: string): 'PASS' | 'FAIL' | 'UNKNOWN' {
  if (!status) return 'UNKNOWN';
  if (status === 'success') return 'PASS';
  if (status === 'failure' || status === 'cancelled') return 'FAIL';
  return 'UNKNOWN';
}

function buildMinimalDescription(meta: {
  runUrl?: string;
  sha?: string;
  runId?: string;
  workflowStatus?: string;
  extra?: string;
}): string {
  return [
    '## Autonomous QA — CI run',
    '',
    `Workflow status: ${meta.workflowStatus ?? 'unknown'}`,
    meta.runId ? `Run ID: ${meta.runId}` : '',
    meta.sha ? `Commit: ${meta.sha}` : '',
    meta.runUrl ? `Workflow run: ${meta.runUrl}` : '',
    meta.extra ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Create one Jira issue per CI run. Called from GitHub Actions after tests (if: always).
 */
export async function publishCiRunTicketEveryRun(meta: {
  workflowStatus?: string;
  runUrl?: string;
  sha?: string;
  runId?: string;
  outputDir?: string;
} = {}): Promise<MaintenanceTicketPublishResult> {
  const failureId = `ci-run-${meta.runId ?? process.env.GITHUB_RUN_ID ?? Date.now()}`;

  if (!isCiSummaryPublishEnabled()) {
    return {
      provider: 'jira',
      published: false,
      failureId,
      error: 'Jira publish disabled (set MAINTENANCE_PUBLISH_JIRA=1)',
    };
  }

  const config = resolveJiraConfigFromEnv();
  if (!config) {
    return {
      provider: 'jira',
      published: false,
      failureId,
      error: 'Missing JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, or JIRA_PROJECT_KEY (check GitHub secrets)',
    };
  }

  const context = readCiRunContextForJira(meta.outputDir);
  const runUrl = meta.runUrl ?? context?.runUrl ?? resolveGithubActionsRunUrl();
  const sha = meta.sha ?? context?.sha ?? process.env.GITHUB_SHA;
  const runId = meta.runId ?? context?.runId ?? process.env.GITHUB_RUN_ID;
  const workflowStatus = meta.workflowStatus ?? context?.workflowStatus ?? process.env.CI_RUN_STATUS;

  let passFail: 'PASS' | 'FAIL' | 'UNKNOWN' = mapWorkflowStatusToPassFail(workflowStatus);
  let description: string;
  let journeyLabel = '';

  if (context?.suite) {
    passFail =
      context.suite.kpis.failedCount === 0 && !context.suite.suiteCostCapExceeded ? 'PASS' : 'FAIL';
    journeyLabel = ` (${context.suite.kpis.completedCount}/${context.suite.kpis.journeyCount} journeys)`;
    description = buildCiRunSummaryDescription(context.suite, context.maintenanceResults ?? [], {
      runUrl,
      sha,
      workflowStatus,
    });
  } else {
    description = buildMinimalDescription({ runUrl, sha, runId, workflowStatus });
  }

  const date = new Date().toISOString().slice(0, 10);
  const summary = `[Autonomous QA] Run #${runId ?? 'local'} ${passFail} — ${date}${journeyLabel}`;

  const created = await createJiraIssueWithTypeFallback(config, {
    summary,
    description,
    labels: ['autonomous-qa', 'ci-run', passFail.toLowerCase()],
  });

  if (!created.ok) {
    return {
      provider: 'jira',
      published: false,
      failureId,
      error: created.error,
    };
  }

  const result: MaintenanceTicketPublishResult = {
    provider: 'jira',
    published: true,
    failureId,
    externalId: created.issueKey,
    externalUrl: created.issueUrl,
  };

  const outDir = meta.outputDir ?? process.env.MAINTENANCE_OUTPUT_DIR ?? 'maintenance-output';
  mkdirSync(resolve(outDir), { recursive: true });
  writeFileSync(resolve(outDir, 'ci-jira-publish-result.json'), JSON.stringify({ ...result, issueType: created.issueType }, null, 2), 'utf8');

  return result;
}

/** Post a Jira issue summarizing each autonomous CI run (from Playwright test context). */
export async function publishAutonomousCiSummaryToJira(
  suite: AutonomousSuiteResult,
  maintenanceResults: MaintenanceAgentResult[] = [],
  meta: { runUrl?: string; sha?: string; runId?: string } = {}
): Promise<MaintenanceTicketPublishResult | null> {
  writeCiRunContextForJira({
    suite,
    maintenanceResults,
    sha: meta.sha,
    runId: meta.runId,
    runUrl: meta.runUrl ?? resolveGithubActionsRunUrl(),
  });

  if (!isCiSummaryPublishEnabled()) return null;

  return publishCiRunTicketEveryRun({
    runUrl: meta.runUrl,
    sha: meta.sha,
    runId: meta.runId,
    workflowStatus: suite.kpis.failedCount === 0 ? 'success' : 'failure',
  });
}

export function resolveGithubActionsRunUrl(): string | undefined {
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!server || !repo || !runId) return undefined;
  return `${server}/${repo}/actions/runs/${runId}`;
}
