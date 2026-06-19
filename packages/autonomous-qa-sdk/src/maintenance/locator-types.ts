import type { MaintenanceHealingSnapshot } from 'autonomous-agent-contracts';
import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';

export type LocatorTargetMapping = {
  filePath: string;
  methodName: string;
  actionKey: string;
};

export function toHealingSnapshot(candidate: GeneratedLocatorCandidate): MaintenanceHealingSnapshot {
  if (candidate.query.type === 'css') {
    return {
      strategyName: candidate.strategyName,
      score: candidate.score,
      reason: candidate.reason,
      query: { type: 'css', value: candidate.query.value },
    };
  }
  return {
    strategyName: candidate.strategyName,
    score: candidate.score,
    reason: candidate.reason,
    query: { type: 'role', role: String(candidate.query.role), name: candidate.query.name },
  };
}

export function snapshotToCandidate(snapshot: MaintenanceHealingSnapshot): GeneratedLocatorCandidate {
  if (snapshot.query.type === 'css') {
    return {
      strategyName: snapshot.strategyName,
      score: snapshot.score,
      reason: snapshot.reason,
      query: { type: 'css', value: snapshot.query.value ?? '' },
    };
  }
  return {
    strategyName: snapshot.strategyName,
    score: snapshot.score,
    reason: snapshot.reason,
    query: {
      type: 'role',
      role: (snapshot.query.role ?? 'button') as 'button',
      name: snapshot.query.name ?? '',
    },
  };
}
