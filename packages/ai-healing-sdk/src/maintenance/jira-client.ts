import type { MaintenanceTicketPayload } from 'autonomous-agent-contracts';

export type JiraClientConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType?: string;
};

export function resolveJiraConfigFromEnv(): JiraClientConfig | null {
  const baseUrl = process.env.JIRA_BASE_URL ?? process.env.ATLASSIAN_SITE_URL;
  const email = process.env.JIRA_EMAIL ?? process.env.ATLASSIAN_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN ?? process.env.ATLASSIAN_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!baseUrl || !email || !apiToken || !projectKey) return null;

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    email,
    apiToken,
    projectKey,
    issueType: process.env.JIRA_ISSUE_TYPE ?? 'Bug',
  };
}

export function isJiraPublishEnabled(options?: { publishTicketsLive?: boolean }): boolean {
  if (options?.publishTicketsLive === false) return false;
  if (options?.publishTicketsLive === true) return resolveJiraConfigFromEnv() !== null;
  const flag = process.env.MAINTENANCE_PUBLISH_JIRA ?? process.env.JIRA_PUBLISH_TICKETS;
  if (flag === '0' || flag === 'false') return false;
  if (flag === '1' || flag === 'true') return resolveJiraConfigFromEnv() !== null;
  return resolveJiraConfigFromEnv() !== null && process.env.CI === 'true';
}

/** Convert plain-text maintenance description to Jira Cloud ADF (minimal). */
export function maintenanceDescriptionToAdf(description: string): Record<string, unknown> {
  const lines = description.split('\n');
  const content: Record<string, unknown>[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith('```')) continue;
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    });
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: description.slice(0, 32000) }] });
  }

  return { type: 'doc', version: 1, content };
}

export function buildJiraCreateIssueBody(
  config: JiraClientConfig,
  ticket: MaintenanceTicketPayload
): Record<string, unknown> {
  return {
    fields: {
      project: { key: config.projectKey },
      issuetype: { name: config.issueType ?? 'Bug' },
      summary: ticket.title.slice(0, 255),
      description: maintenanceDescriptionToAdf(ticket.description),
      labels: ticket.labels.map((l) => l.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50)),
    },
  };
}

function basicAuthHeader(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
}

export async function createJiraIssueFromTicket(
  config: JiraClientConfig,
  ticket: MaintenanceTicketPayload,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: true; issueKey: string; issueUrl: string } | { ok: false; error: string }> {
  const url = `${config.baseUrl}/rest/api/3/issue`;
  const body = buildJiraCreateIssueBody(config, ticket);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(config.email, config.apiToken),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      return { ok: false, error: `Jira HTTP ${response.status}: ${text.slice(0, 500)}` };
    }

    const json = JSON.parse(text) as { key?: string; id?: string };
    const issueKey = json.key ?? json.id;
    if (!issueKey) {
      return { ok: false, error: 'Jira response missing issue key' };
    }

    return {
      ok: true,
      issueKey,
      issueUrl: `${config.baseUrl}/browse/${issueKey}`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
