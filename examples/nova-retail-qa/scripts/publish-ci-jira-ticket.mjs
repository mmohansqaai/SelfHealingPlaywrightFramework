#!/usr/bin/env node
/**
 * Create one Jira issue per CI run (GitHub Actions step — runs if: always).
 * Requires MAINTENANCE_PUBLISH_JIRA=1 and JIRA_* secrets.
 */
import { existsSync } from 'node:fs';
import { publishCiRunTicketEveryRun, resolveGithubActionsRunUrl } from 'autonomous-qa-sdk';

async function main() {
  const result = await publishCiRunTicketEveryRun({
    workflowStatus: process.env.CI_RUN_STATUS ?? process.env.GITHUB_JOB_STATUS,
    runUrl: resolveGithubActionsRunUrl(),
    sha: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
  });

  console.log('[jira] publish result:', JSON.stringify(result, null, 2));

  const resultPath = 'maintenance-output/ci-jira-publish-result.json';
  if (existsSync(resultPath)) {
    console.log('[jira] wrote', resultPath);
  }

  if (!result.published) {
    console.error('[jira] FAILED:', result.error ?? 'unknown error');
    process.exitCode = 1;
    return;
  }

  console.log(`[jira] Created ${result.externalId}: ${result.externalUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
