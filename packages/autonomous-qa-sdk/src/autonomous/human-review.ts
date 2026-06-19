import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AutonomousRunResult } from 'autonomous-agent-contracts';
import { formatAutonomousTraceBody } from './run-autonomous-test';
import { generatePlaywrightSpecFromTrace } from './trace-to-spec';

export type AutonomousReviewArtifact = {
  runId: string;
  journeyId?: string;
  status: AutonomousRunResult['status'];
  needsHumanReview: boolean;
  goal: string;
  verificationDetail: string;
  estimatedCostUsd: number;
  tracePath: string;
  specPath?: string;
};

export function formatHumanReviewBody(result: AutonomousRunResult): string {
  const lines = [
    '=== AUTONOMOUS RUN — HUMAN REVIEW REQUIRED ===',
    '',
    `Journey ID: ${result.journeyId ?? '(none)'}`,
    `Status: ${result.status}`,
    `Needs review: ${result.governance.needsHumanReview ? 'YES' : 'no'}`,
    `Est. cost (USD): $${result.governance.estimatedCostUsd.toFixed(4)}`,
    `Duration (ms): ${result.governance.durationMs}`,
    `Cost cap exceeded: ${result.governance.costCapExceeded ? 'YES' : 'no'}`,
    '',
    'Review checklist:',
    '  [ ] Trace steps match intended user journey',
    '  [ ] No unexpected navigation or domain',
    '  [ ] Credentials came from env (not logged in goal text)',
    '  [ ] Generated spec (if any) is safe to merge',
    '',
    formatAutonomousTraceBody(result),
  ];
  return lines.join('\n');
}

export function writeAutonomousReviewArtifact(
  result: AutonomousRunResult,
  outputDir = process.env.AUTONOMOUS_REVIEW_DIR ?? 'autonomous-review'
): AutonomousReviewArtifact {
  const runId = `${result.journeyId ?? 'run'}-${Date.now()}`;
  const dir = path.resolve(outputDir);
  fs.mkdirSync(dir, { recursive: true });

  const tracePath = path.join(dir, `${runId}-trace.txt`);
  fs.writeFileSync(tracePath, formatAutonomousTraceBody(result), 'utf8');

  let specPath: string | undefined;
  if (result.status === 'completed') {
    specPath = path.join(dir, `${runId}-generated.spec.ts`);
    fs.writeFileSync(
      specPath,
      generatePlaywrightSpecFromTrace(result, result.journeyId ?? 'autonomous journey'),
      'utf8'
    );
  }

  const reviewPath = path.join(dir, `${runId}-review.json`);
  const artifact: AutonomousReviewArtifact = {
    runId,
    journeyId: result.journeyId,
    status: result.status,
    needsHumanReview: result.governance.needsHumanReview,
    goal: result.goal,
    verificationDetail: result.verification.detail,
    estimatedCostUsd: result.governance.estimatedCostUsd,
    tracePath,
    specPath,
  };
  fs.writeFileSync(reviewPath, JSON.stringify(artifact, null, 2), 'utf8');

  if (result.governance.needsHumanReview) {
    fs.writeFileSync(path.join(dir, `${runId}-HUMAN-REVIEW.txt`), formatHumanReviewBody(result), 'utf8');
  }

  return artifact;
}
