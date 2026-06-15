import { test, expect } from '@playwright/test';
import {
  buildCiRunSummaryDescription,
  buildJiraCreateIssueBody,
  buildMaintenanceTicket,
  isCiSummaryPublishEnabled,
  isJiraPublishEnabled,
  maintenanceDescriptionToAdf,
  publishMaintenanceTicketsToJira,
  resolveJiraConfigFromEnv,
  resolveCiSummaryIssueTypes,
} from 'ai-healing-sdk';
import type { AutonomousSuiteResult } from 'autonomous-agent-contracts';

test.describe('Jira maintenance publish unit', () => {
  test('resolveJiraConfigFromEnv reads standard env vars', () => {
    process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
    process.env.JIRA_EMAIL = 'bot@example.com';
    process.env.JIRA_API_TOKEN = 'token';
    process.env.JIRA_PROJECT_KEY = 'QA';

    const config = resolveJiraConfigFromEnv();
    expect(config?.baseUrl).toBe('https://example.atlassian.net');
    expect(config?.projectKey).toBe('QA');

    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
    delete process.env.JIRA_PROJECT_KEY;
  });

  test('maintenanceDescriptionToAdf produces doc structure', () => {
    const adf = maintenanceDescriptionToAdf('Line one\nLine two');
    expect(adf.type).toBe('doc');
    expect(Array.isArray((adf as { content: unknown[] }).content)).toBe(true);
  });

  test('buildJiraCreateIssueBody includes project and summary', () => {
    const failure = {
      id: 'test-failure',
      stepId: 'fill-email',
      targetHint: 'email',
      pageUrl: 'https://x/login',
      failureCount: 3,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    const ticket = buildMaintenanceTicket(failure, 'jira');
    const body = buildJiraCreateIssueBody(
      {
        baseUrl: 'https://example.atlassian.net',
        email: 'a@b.com',
        apiToken: 't',
        projectKey: 'QA',
        issueType: 'Bug',
      },
      ticket
    );
    const fields = body.fields as Record<string, unknown>;
    expect((fields.project as { key: string }).key).toBe('QA');
    expect((fields.summary as string).length).toBeGreaterThan(0);
  });

  test('publishMaintenanceTicketsToJira skips when not configured', async () => {
    delete process.env.JIRA_BASE_URL;
    const results = await publishMaintenanceTicketsToJira([], { publishTicketsLive: true });
    expect(results).toEqual([]);
  });

  test('isCiSummaryPublishEnabled defaults on in CI when Jira configured', () => {
    process.env.CI = 'true';
    process.env.MAINTENANCE_PUBLISH_JIRA = '1';
    process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
    process.env.JIRA_EMAIL = 'bot@example.com';
    process.env.JIRA_API_TOKEN = 'token';
    process.env.JIRA_PROJECT_KEY = 'QA';
    expect(isCiSummaryPublishEnabled()).toBe(true);
    delete process.env.CI;
    delete process.env.MAINTENANCE_PUBLISH_JIRA;
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
    delete process.env.JIRA_PROJECT_KEY;
  });

  test('resolveCiSummaryIssueTypes defaults to Story,Task,Bug', () => {
    delete process.env.JIRA_CI_SUMMARY_ISSUE_TYPE;
    expect(resolveCiSummaryIssueTypes()).toEqual(['Story', 'Task', 'Bug']);
    process.env.JIRA_CI_SUMMARY_ISSUE_TYPE = 'Epic,Story';
    expect(resolveCiSummaryIssueTypes()).toEqual(['Epic', 'Story']);
    delete process.env.JIRA_CI_SUMMARY_ISSUE_TYPE;
  });

  test('buildCiRunSummaryDescription includes KPI block', () => {
    const suite: AutonomousSuiteResult = {
      suiteCostCapExceeded: false,
      kpis: {
        journeyCount: 2,
        completedCount: 2,
        failedCount: 0,
        goalCompletionRate: 1,
        avgStepsExecuted: 8,
        avgReplans: 0,
        totalEstimatedCostUsd: 0.01,
        avgEstimatedCostUsd: 0.005,
        needsHumanReviewCount: 0,
        failedJourneyIds: [],
      },
      results: [],
    };
    const body = buildCiRunSummaryDescription(suite, [], { sha: 'abc123' });
    expect(body).toContain('PASS');
    expect(body).toContain('Goal completion rate');
    expect(body).toContain('abc123');
  });
});
