#!/usr/bin/env node
/**
 * Mark a maintenance locator proposal as approved (human gate before PR bot).
 *
 * Usage:
 *   npm run maintenance:approve -- maintenance-output/patches/prop-fill-email-123.json
 */
import { resolve } from 'node:path';
import { approveMaintenanceProposal } from 'ai-healing-sdk';

const proposalPath = resolve(process.argv[2] ?? '');
if (!proposalPath) {
  console.error('Usage: npm run maintenance:approve -- <proposal.json>');
  process.exit(1);
}

const result = approveMaintenanceProposal(proposalPath);
if (!result.ok) {
  console.error(result.reason);
  process.exit(1);
}

console.log(JSON.stringify({ approved: result.proposal.proposalId, path: proposalPath }, null, 2));
