import type {
  GeneratedLocatorCandidate,
  GeneratedLocatorQuery,
  HealingActionType,
  HealingAttempt,
  HealingDriver,
  HealingRequest,
  HealingResult,
} from 'ai-healing-core';
import { formatLocatorQuery } from 'ai-healing-core';
import { failureHints } from './intent-hints';
import { runLocalAgentEngine, postHealRequest } from './local-agent-engine';

export type AgentMode = 'local' | 'remote' | 'auto';

export type DriverHealingOptions = {
  framework: string;
  healingEnabled: boolean;
  healingServiceUrl?: string;
  agentMode?: AgentMode;
  maxIterations?: number;
  maxCandidates?: number;
  timeoutMs?: number;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function scoreCandidateViability(driver: HealingDriver, candidate: GeneratedLocatorCandidate): Promise<number> {
  try {
    const count = await driver.count(candidate.query);
    if (count < 1) return -1000;
    return count === 1 ? 10 : Math.max(0, 6 - count);
  } catch {
    return -1000;
  }
}

async function resolveRemoteCandidates(
  driver: HealingDriver,
  actionType: HealingActionType,
  attempts: HealingAttempt[],
  options: DriverHealingOptions,
  iteration: number,
  maxIterations: number
): Promise<GeneratedLocatorCandidate[]> {
  const serviceUrl = options.healingServiceUrl?.replace(/\/$/, '');
  if (!serviceUrl) return [];

  const request: HealingRequest = {
    framework: options.framework,
    action: actionType,
    failedLocator: attempts[attempts.length - 1]?.strategy ?? 'primary',
    error: attempts[attempts.length - 1]?.error ?? 'primary locator failed',
    url: driver.url(),
    pageTitle: await driver.title().catch(() => undefined),
    domSnapshot: await driver.captureDomSnapshot(actionType).catch(() => []),
    failureHints: failureHints(attempts),
    agentContext: { iteration, maxIterations, agentMode: 'agentic' },
  };

  const response = await postHealRequest(serviceUrl, request, options.timeoutMs ?? 8000);
  if (response.status !== 'healed' || !response.candidates?.length) return [];

  return response.candidates
    .map((c) => ({
      strategyName: c.strategy,
      query: c.query,
      score: c.score,
      reason: `[agentic-service] ${c.reasoning}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxCandidates ?? 8);
}

async function resolveLocalCandidates(
  driver: HealingDriver,
  actionType: HealingActionType,
  attempts: HealingAttempt[],
  options: DriverHealingOptions,
  iteration: number,
  maxIterations: number
): Promise<GeneratedLocatorCandidate[]> {
  const request: HealingRequest = {
    framework: options.framework,
    action: actionType,
    failedLocator: attempts[attempts.length - 1]?.strategy ?? 'primary',
    error: attempts[attempts.length - 1]?.error ?? 'primary locator failed',
    url: driver.url(),
    pageTitle: await driver.title().catch(() => undefined),
    domSnapshot: await driver.captureDomSnapshot(actionType).catch(() => []),
    failureHints: failureHints(attempts),
    agentContext: { iteration, maxIterations, agentMode: 'agentic' },
  };

  const engine = runLocalAgentEngine(request, attempts);
  const scored: GeneratedLocatorCandidate[] = [];
  for (const c of engine.candidates) {
    const bonus = await scoreCandidateViability(driver, c);
    if (bonus < -100) continue;
    scored.push({ ...c, score: c.score + bonus });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, options.maxCandidates ?? 8);
}

function resolveAgentMode(options: DriverHealingOptions): AgentMode {
  const mode = options.agentMode ?? 'auto';
  if (mode !== 'auto') return mode;
  return options.healingServiceUrl ? 'remote' : 'local';
}

/**
 * Framework-agnostic agentic healing loop for any HealingDriver.
 * Primary fail → local agent OR remote service → validate candidates → reflect/retry.
 */
export async function runDriverHealingLoop<T>(
  driver: HealingDriver,
  actionType: HealingActionType,
  primary: GeneratedLocatorQuery,
  action: (query: GeneratedLocatorQuery) => Promise<T>,
  options: DriverHealingOptions
): Promise<HealingResult<T>> {
  const attempts: HealingAttempt[] = [];
  const maxIterations = options.maxIterations ?? Number(process.env.HEALING_AGENT_MAX_ITERATIONS || 3);

  try {
    const value = await action(primary);
    return { value, usedStrategy: 'direct', attempts: [{ strategy: 'direct', ok: true }] };
  } catch (error) {
    attempts.push({
      strategy: formatLocatorQuery(primary),
      ok: false,
      error: errorMessage(error),
      query: primary,
    });
  }

  if (!options.healingEnabled) {
    throw new Error(`Healing disabled and primary failed: ${attempts[0]?.error ?? 'unknown'}`);
  }

  const mode = resolveAgentMode(options);
  let lastError: unknown;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const candidates =
      mode === 'remote'
        ? await resolveRemoteCandidates(driver, actionType, attempts, options, iteration, maxIterations)
        : await resolveLocalCandidates(driver, actionType, attempts, options, iteration, maxIterations);

    if (!candidates.length) continue;

    for (const candidate of candidates) {
      try {
        const value = await action(candidate.query);
        attempts.push({
          strategy: candidate.strategyName,
          ok: true,
          autogenerated: true,
          score: candidate.score,
          reason: candidate.reason,
          query: candidate.query,
        });
        return {
          value,
          usedStrategy: candidate.strategyName,
          attempts,
          autoHeal: {
            usedAutoGenerated: true,
            selectedCandidate: candidate,
            candidates,
          },
        };
      } catch (error) {
        lastError = error;
        attempts.push({
          strategy: candidate.strategyName,
          ok: false,
          error: errorMessage(error),
          autogenerated: true,
          score: candidate.score,
          reason: candidate.reason,
          query: candidate.query,
        });
      }
    }
  }

  throw new Error(
    `Agentic healing exhausted (${mode} mode, ${maxIterations} iteration(s)). Last: ${lastError instanceof Error ? lastError.message : String(lastError ?? attempts.at(-1)?.error ?? 'unknown')}`
  );
}
