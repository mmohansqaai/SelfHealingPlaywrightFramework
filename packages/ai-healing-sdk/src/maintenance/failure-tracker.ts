import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MaintenanceFailureRecord, MaintenancePlannerHint } from 'autonomous-agent-contracts';
import { mergePlannerHints } from './maintenance-context';

type FailureStore = Record<string, MaintenanceFailureRecord>;

function storePath(custom?: string): string {
  return resolve(process.cwd(), custom ?? process.env.MAINTENANCE_FAILURE_STORE ?? '.maintenance-failures.json');
}

function failureKey(stepId: string, targetHint: string, pageUrl: string): string {
  let pathPattern = pageUrl;
  try {
    pathPattern = new URL(pageUrl).pathname;
  } catch {
    // keep raw
  }
  return `${stepId}|${targetHint.toLowerCase()}|${pathPattern}`;
}

function readStore(path: string): FailureStore {
  if (!existsSync(path)) return {};
  try {
    return (JSON.parse(readFileSync(path, 'utf8')) as FailureStore) ?? {};
  } catch {
    return {};
  }
}

function writeStore(path: string, store: FailureStore): void {
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
}

export function recordMaintenanceFailure(params: {
  stepId: string;
  targetHint: string;
  pageUrl: string;
  error?: string;
  storePath?: string;
  plannerHints?: MaintenancePlannerHint[];
}): MaintenanceFailureRecord {
  const file = storePath(params.storePath);
  const store = readStore(file);
  const key = failureKey(params.stepId, params.targetHint, params.pageUrl);
  const now = new Date().toISOString();
  const existing = store[key];
  const record: MaintenanceFailureRecord = {
    id: key,
    stepId: params.stepId,
    targetHint: params.targetHint,
    pageUrl: params.pageUrl,
    failureCount: (existing?.failureCount ?? 0) + 1,
    lastError: params.error,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    plannerHints: mergePlannerHints(existing?.plannerHints, params.plannerHints ?? []),
  };
  store[key] = record;
  writeStore(file, store);
  return record;
}

export function listMaintenanceFailures(threshold = 1, customPath?: string): MaintenanceFailureRecord[] {
  const store = readStore(storePath(customPath));
  return Object.values(store).filter((r) => r.failureCount >= threshold);
}

export function maintenanceFailureStorePath(): string {
  return storePath();
}
