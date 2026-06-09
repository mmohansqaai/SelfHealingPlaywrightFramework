import type { HealingRequest } from 'ai-healing-sdk';
import { runLocatorAgent } from 'locator-agent';

export type RoutedAgent = 'locator-agent' | 'locator-recovery';

export function routeHealingRequest(_request: HealingRequest): RoutedAgent[] {
  return ['locator-agent'];
}

export function executeRoutedAgents(request: HealingRequest, agents: RoutedAgent[]) {
  const results = [];

  for (const agent of agents) {
    if (agent === 'locator-agent' || agent === 'locator-recovery') {
      const result = runLocatorAgent(request);
      results.push({
        agent: result.agent,
        candidates: result.candidates,
        best: result.best,
      });
    }
  }

  return results;
}
