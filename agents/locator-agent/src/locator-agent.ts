import type { HealingRequest } from 'ai-healing-sdk';
import { mergeLocatorCandidates } from './merge/candidate-merger';
import { pickBestScoredCandidate, scoreCandidates } from './scoring/confidence-scorer';
import { runDomNeighborhoodStrategy } from './strategies/dom-neighborhood';
import { applyHistoricalLearningBoost } from './strategies/historical-learning';
import { runSemanticMatchingStrategy } from './strategies/semantic-matching';
import type { LocatorAgentContext, LocatorAgentResult } from './types';

export function buildLocatorAgentContext(request: HealingRequest): LocatorAgentContext {
  return {
    actionType: request.action,
    failedLocator: request.failedLocator,
    error: request.error,
    url: request.url,
    failureHints: request.failureHints ?? `${request.failedLocator} ${request.error}`,
    domSnapshot: request.domSnapshot,
  };
}

/**
 * Locator Agent — orchestrates modular healing strategies and confidence scoring.
 * Candidate pool matches Phase 2 (semantic seed + DOM scan merge) when history is absent.
 */
export function runLocatorAgent(request: HealingRequest): LocatorAgentResult {
  const ctx = buildLocatorAgentContext(request);

  const merged = mergeLocatorCandidates([
    ...runSemanticMatchingStrategy(ctx),
    ...runDomNeighborhoodStrategy(ctx),
  ]);
  const withHistory = applyHistoricalLearningBoost(ctx, merged);
  const scored = scoreCandidates(withHistory);
  const best = pickBestScoredCandidate(scored);

  return {
    agent: 'locator-agent',
    candidates: scored,
    best,
  };
}

/** Backward-compatible alias for healing-service Phase 2 router. */
export function runLocatorRecoveryAgent(request: HealingRequest) {
  return runLocatorAgent(request).candidates;
}
