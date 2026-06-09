import type { HealingRequest, HealingResponse } from 'ai-healing-sdk';
import { readCachedResponse, writeCachedResponse } from '../cache/simple-cache';
import { executeRoutedAgents, routeHealingRequest } from '../routing/agent-router';
import { pickBestCandidate, toResponseCandidates } from '../scoring/confidence-scorer';
import { logHealCycle, logHealingEvent } from '../telemetry/events';

export function orchestrateHealing(request: HealingRequest): HealingResponse {
  const started = Date.now();
  logHealingEvent({
    type: 'heal.request',
    url: request.url,
    action: request.action,
    framework: request.framework,
  });

  const cached = readCachedResponse(request);
  if (cached) {
    logHealingEvent({ type: 'heal.cache_hit', url: request.url });
    return cached;
  }

  const agents = routeHealingRequest(request);
  const agentResults = executeRoutedAgents(request, agents);
  const rawCandidates = agentResults.flatMap((r) => r.candidates);
  const candidates = toResponseCandidates(rawCandidates);
  const best = pickBestCandidate(candidates);

  const response: HealingResponse = best
    ? {
        status: 'healed',
        healedLocator: best.healedLocator,
        confidence: best.confidence,
        strategy: best.strategy,
        reasoning: best.reasoning,
        candidates,
      }
    : {
        status: 'no_match',
        candidates: [],
        reasoning: 'No viable locator candidates found for this failure context.',
      };

  writeCachedResponse(request, response);
  logHealCycle(request, response, Date.now() - started);
  return response;
}
