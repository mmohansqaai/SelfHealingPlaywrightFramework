import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MaintenancePersistenceProposal } from 'autonomous-agent-contracts';
import { previewPersistencePatch } from '../core/persistence';
import { resolveLocatorTarget, snapshotToCandidate, toHealingSnapshot } from './locator-target-map';
import type { GeneratedLocatorCandidate } from '../core/healing-types';

export function createPersistenceProposal(params: {
  stepId: string;
  targetHint: string;
  candidate: GeneratedLocatorCandidate;
  outputDir?: string;
}): MaintenancePersistenceProposal | { ok: false; reason: string } {
  const target = resolveLocatorTarget(params.targetHint);
  if (!target) {
    return { ok: false, reason: `no page object mapping for hint: ${params.targetHint}` };
  }

  const preview = previewPersistencePatch({
    target: { filePath: target.filePath, methodName: target.methodName },
    candidate: params.candidate,
    minConfidence: Number(process.env.MAINTENANCE_MIN_CONFIDENCE ?? 70),
    validationPasses: 2,
  });

  if (!preview.ok) {
    return { ok: false, reason: preview.reason };
  }

  return {
    proposalId: `prop-${params.stepId}-${Date.now()}`,
    stepId: params.stepId,
    targetHint: params.targetHint,
    targetFile: preview.filePath,
    methodName: preview.methodName,
    candidate: toHealingSnapshot(params.candidate),
    patchSnippet: preview.snippet,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  };
}

export function writePersistenceProposal(
  proposal: MaintenancePersistenceProposal,
  outputDir = process.env.MAINTENANCE_PATCH_DIR ?? 'maintenance-patches'
): string {
  const dir = path.resolve(outputDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${proposal.proposalId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), 'utf8');

  const readmePath = path.join(dir, `${proposal.proposalId}-APPLY.md`);
  fs.writeFileSync(
    readmePath,
    [
      `# Locator persistence proposal — ${proposal.proposalId}`,
      '',
      '**Status:** pending human PR review — do not auto-merge.',
      '',
      `- Target: \`${proposal.targetFile}#${proposal.methodName}\``,
      `- Step: \`${proposal.stepId}\` (${proposal.targetHint})`,
      `- Strategy: \`${proposal.candidate.strategyName}\` (score ${proposal.candidate.score})`,
      '',
      '## Patch snippet',
      '',
      '```typescript',
      proposal.patchSnippet,
      '```',
      '',
      '## Apply after approval',
      '',
      '```typescript',
      'import { applyMaintenanceProposal } from "ai-healing-sdk";',
      `await applyMaintenanceProposal('${filePath}');`,
      '```',
    ].join('\n'),
    'utf8'
  );

  return filePath;
}

export { snapshotToCandidate };
