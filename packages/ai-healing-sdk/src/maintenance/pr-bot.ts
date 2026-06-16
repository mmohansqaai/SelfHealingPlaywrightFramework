import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import type { MaintenancePersistenceProposal, MaintenancePrBotResult } from 'autonomous-agent-contracts';
import { applyMaintenanceProposal } from './maintenance-agent';
import { loadProposalsFromDir } from './maintenance-context';

export type MaintenancePrBotOptions = {
  outputDir?: string;
  baseBranch?: string;
  dryRun?: boolean;
  /** When true, run git commit/push and open draft PR via gh CLI. */
  openPr?: boolean;
};

export function approveMaintenanceProposal(
  proposalPath: string
): { ok: true; proposal: MaintenancePersistenceProposal } | { ok: false; reason: string } {
  const abs = resolve(proposalPath);
  if (!existsSync(abs)) return { ok: false, reason: `Proposal not found: ${abs}` };
  try {
    const proposal = JSON.parse(readFileSync(abs, 'utf8')) as MaintenancePersistenceProposal;
    if (proposal.status === 'applied') {
      return { ok: false, reason: 'Proposal already applied' };
    }
    const updated: MaintenancePersistenceProposal = {
      ...proposal,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      proposalFilePath: abs,
    };
    writeFileSync(abs, JSON.stringify(updated, null, 2), 'utf8');
    return { ok: true, proposal: updated };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function markProposalApplied(proposalPath: string): void {
  const abs = resolve(proposalPath);
  const proposal = JSON.parse(readFileSync(abs, 'utf8')) as MaintenancePersistenceProposal;
  writeFileSync(
    abs,
    JSON.stringify(
      { ...proposal, status: 'applied', appliedAt: new Date().toISOString(), proposalFilePath: abs },
      null,
      2
    ),
    'utf8'
  );
}

export function listApprovedProposals(patchesDir: string): MaintenancePersistenceProposal[] {
  return loadProposalsFromDir(patchesDir).filter((p) => p.status === 'approved');
}

export function formatMaintenancePrBody(proposals: MaintenancePersistenceProposal[]): string {
  const lines = [
    '## Autonomous maintenance — locator persistence',
    '',
    'Draft PR opened by the Phase 15 maintenance PR bot. Human review required before merge.',
    '',
    '### Proposals applied',
    '',
  ];
  for (const p of proposals) {
    lines.push(
      `- \`${p.proposalId}\` → \`${p.targetFile}#${p.methodName}\` (${p.candidate.strategyName}, score ${p.candidate.score})`
    );
  }
  lines.push('', '### Test plan', '', '- [ ] Review generated strategy snippets', '- [ ] Run `npm run test:autonomous-ci-smoke`', '- [ ] Run affected page object tests');
  return lines.join('\n');
}

export function applyApprovedMaintenanceProposals(
  patchesDir: string
): { applied: MaintenancePersistenceProposal[]; changedFiles: string[]; errors: string[] } {
  const approved = listApprovedProposals(patchesDir);
  const applied: MaintenancePersistenceProposal[] = [];
  const changedFiles: string[] = [];
  const errors: string[] = [];

  for (const proposal of approved) {
    const path = proposal.proposalFilePath ?? resolve(patchesDir, `${proposal.proposalId}.json`);
    const result = applyMaintenanceProposal(path);
    if (!result.ok) {
      errors.push(`${proposal.proposalId}: ${result.reason}`);
      continue;
    }
    markProposalApplied(path);
    applied.push(proposal);
    if (!changedFiles.includes(result.filePath)) {
      changedFiles.push(result.filePath);
    }
  }

  return { applied, changedFiles, errors };
}

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function hasGhCli(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Phase 15 — apply approved proposals and optionally open a draft PR. */
export async function openMaintenanceDraftPr(
  options: MaintenancePrBotOptions = {}
): Promise<MaintenancePrBotResult> {
  const outputDir = resolve(options.outputDir ?? process.env.MAINTENANCE_OUTPUT_DIR ?? 'maintenance-output');
  const patchesDir = `${outputDir}/patches`;
  const dryRun = options.dryRun === true || process.env.MAINTENANCE_PR_DRY_RUN === '1';
  const openPr = options.openPr ?? process.env.MAINTENANCE_OPEN_PR === '1';
  const approved = listApprovedProposals(patchesDir);

  if (approved.length === 0) {
    return {
      opened: false,
      dryRun,
      proposalsApplied: [],
      changedFiles: [],
      error: 'No approved proposals found in maintenance-output/patches/',
    };
  }

  if (dryRun || !openPr) {
    return {
      opened: false,
      dryRun: true,
      proposalsApplied: approved.map((p) => p.proposalId),
      changedFiles: [...new Set(approved.map((p) => p.targetFile))],
      error: dryRun ? undefined : 'Set MAINTENANCE_OPEN_PR=1 to open a draft PR',
    };
  }

  const { applied, changedFiles, errors } = applyApprovedMaintenanceProposals(patchesDir);
  if (applied.length === 0) {
    return {
      opened: false,
      proposalsApplied: [],
      changedFiles,
      error: errors[0] ?? 'Failed to apply approved proposals',
    };
  }

  if (!hasGhCli()) {
    return {
      opened: false,
      proposalsApplied: applied.map((p) => p.proposalId),
      changedFiles,
      error: 'GitHub CLI (gh) not found — install gh or apply patches manually',
    };
  }

  const cwd = process.cwd();
  const baseBranch = options.baseBranch ?? process.env.MAINTENANCE_PR_BASE ?? 'main';
  const branch = `maintenance/locator-${Date.now()}`;

  try {
    git(`checkout -b ${branch}`, cwd);
    git(`add ${changedFiles.map((f) => `"${f}"`).join(' ')}`, cwd);
    git(`commit -m "chore(maintenance): apply ${applied.length} locator proposal(s)"`, cwd);
    git(`push -u origin ${branch}`, cwd);

    const bodyDir = mkdtempSync(join(tmpdir(), 'maint-pr-'));
    const bodyPath = join(bodyDir, 'body.md');
    writeFileSync(bodyPath, formatMaintenancePrBody(applied), 'utf8');
    const prUrl = execSync(
      `gh pr create --draft --base ${baseBranch} --head ${branch} --title "chore(maintenance): locator persistence (${applied.length})" --body-file "${bodyPath}"`,
      { cwd, encoding: 'utf8' }
    ).trim();

    return {
      opened: true,
      branch,
      prUrl,
      proposalsApplied: applied.map((p) => p.proposalId),
      changedFiles,
      error: errors.length ? errors.join('; ') : undefined,
    };
  } catch (error) {
    return {
      opened: false,
      branch,
      proposalsApplied: applied.map((p) => p.proposalId),
      changedFiles,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
