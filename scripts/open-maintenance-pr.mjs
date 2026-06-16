#!/usr/bin/env node
/**
 * Apply approved maintenance proposals and optionally open a draft GitHub PR.
 *
 * Usage:
 *   MAINTENANCE_PR_DRY_RUN=1 npm run maintenance:open-pr
 *   MAINTENANCE_OPEN_PR=1 npm run maintenance:open-pr
 */
import { openMaintenanceDraftPr } from 'ai-healing-sdk';

async function main() {
  const result = await openMaintenanceDraftPr({
    outputDir: process.env.MAINTENANCE_OUTPUT_DIR,
    baseBranch: process.env.MAINTENANCE_PR_BASE,
    dryRun: process.env.MAINTENANCE_PR_DRY_RUN === '1',
    openPr: process.env.MAINTENANCE_OPEN_PR === '1',
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.error && !result.dryRun && !result.opened) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
