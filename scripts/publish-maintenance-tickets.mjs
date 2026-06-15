#!/usr/bin/env node
/**
 * Publish maintenance ticket JSON files to Jira Cloud.
 * Requires JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY.
 *
 * Usage:
 *   MAINTENANCE_PUBLISH_JIRA=1 npm run publish:maintenance-tickets
 *   node scripts/publish-maintenance-tickets.mjs maintenance-output/tickets
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { publishMaintenanceTicketsToJira } from 'ai-healing-sdk';

const ticketsDir = resolve(process.argv[2] ?? process.env.MAINTENANCE_TICKETS_DIR ?? 'maintenance-output/tickets');

function loadTickets(dir) {
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    console.error(`No tickets directory: ${dir}`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.log(`No ticket JSON files in ${dir}`);
    return [];
  }
  return files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

async function main() {
  const tickets = loadTickets(ticketsDir);
  if (tickets.length === 0) return;

  const results = await publishMaintenanceTicketsToJira(tickets, { publishTicketsLive: true });
  console.log(JSON.stringify(results, null, 2));

  const failed = results.filter((r) => !r.published);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
