#!/usr/bin/env node
/**
 * Write autonomous KPI summary JSON for dashboard / leadership reporting.
 *
 * Usage:
 *   node scripts/write-autonomous-kpis.mjs autonomous-review/kpi-summary.json
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildAutonomousDashboardKpiDocument, writeAutonomousDashboardKpiDocument } from 'ai-healing-sdk';

const input = process.argv[2] ?? process.env.AUTONOMOUS_KPI_INPUT;
const output = process.argv[3] ?? process.env.AUTONOMOUS_KPI_OUTPUT ?? 'autonomous-review/kpi-summary.json';

if (input && existsSync(resolve(input))) {
  const suite = JSON.parse(readFileSync(resolve(input), 'utf8'));
  const doc = buildAutonomousDashboardKpiDocument(suite);
  console.log(JSON.stringify(doc, null, 2));
  process.exit(0);
}

// Fallback: emit template doc when no suite input (CI documents the contract)
const template = buildAutonomousDashboardKpiDocument(
  {
    results: [],
    kpis: {
      journeyCount: 0,
      completedCount: 0,
      failedCount: 0,
      goalCompletionRate: 0,
      avgStepsExecuted: 0,
      avgReplans: 0,
      totalEstimatedCostUsd: 0,
      avgEstimatedCostUsd: 0,
      needsHumanReviewCount: 0,
      failedJourneyIds: [],
      healRate: 0,
      healedStepsCount: 0,
      totalTraceSteps: 0,
      destructiveActionsBlocked: 0,
      llmPlannerRuns: 0,
    },
    suiteCostCapExceeded: false,
  },
  { suiteName: process.env.SUITE_NAME, buildVersion: process.env.GITHUB_SHA }
);

const path = writeAutonomousDashboardKpiDocument(
  {
    results: [],
    kpis: template.kpis,
    suiteCostCapExceeded: false,
  },
  output
);
console.log(JSON.stringify({ written: path, note: 'Run autonomous CI smoke to populate KPIs' }, null, 2));
