import type { Page } from '@playwright/test';
import { scanDomElements } from '../core/discovery/dom-scan-discovery';
import { failureHints } from '../core/discovery/intent-hints';
import type { GeneratedLocatorCandidate, HealingAttempt, HealingActionType } from '../core/healing-types';
import type { DiscovererFn } from './local-transport';
import type { HealingRequest, HealingResponse } from './contracts';

export type HttpTransportOptions = {
  baseUrl: string;
  timeoutMs?: number;
  framework?: HealingRequest['framework'];
  /** Fall back to in-process discovery when the service is unreachable. */
  fallbackToLocal?: boolean;
  localDiscoverer?: DiscovererFn;
};

function resolveServiceUrl(): string | undefined {
  return process.env.HEALING_SERVICE_URL?.replace(/\/$/, '');
}

async function buildHealingRequest(
  page: Page,
  actionType: HealingActionType,
  attempts: HealingAttempt[],
  framework: HealingRequest['framework']
): Promise<HealingRequest> {
  const domSnapshot = await scanDomElements(page, actionType);
  const hints = failureHints(attempts);
  const lastFailed = [...attempts].reverse().find((a) => !a.ok);

  let pageTitle: string | undefined;
  try {
    pageTitle = await page.title();
  } catch {
    pageTitle = undefined;
  }

  return {
    framework,
    action: actionType,
    failedLocator: lastFailed?.strategy ?? 'unknown',
    error: lastFailed?.error ?? 'unknown failure',
    url: page.url(),
    pageTitle,
    domSnapshot,
    failureHints: hints,
  };
}

async function postHealRequest(baseUrl: string, body: HealingRequest, timeoutMs: number): Promise<HealingResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/heal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json()) as HealingResponse;
    if (!response.ok) {
      return {
        status: 'error',
        error: payload.error ?? `healing-service responded with ${response.status}`,
      };
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function mapResponseToCandidates(response: HealingResponse): GeneratedLocatorCandidate[] {
  if (!response.candidates?.length) return [];

  return response.candidates.map((c) => ({
    strategyName: c.strategy,
    query: c.query,
    score: c.score,
    reason: `[healing-service] ${c.reasoning}`,
  }));
}

/** HTTP discoverer — calls healing-service POST /heal. */
export function createHttpDiscoverer(options: HttpTransportOptions): DiscovererFn {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? Number(process.env.HEALING_SERVICE_TIMEOUT_MS || 8_000);
  const framework = options.framework ?? 'playwright';

  return async ({ page, actionType, attempts }) => {
    const request = await buildHealingRequest(page, actionType, attempts, framework);

    try {
      const response = await postHealRequest(baseUrl, request, timeoutMs);
      if (response.status === 'error') {
        throw new Error(response.error ?? 'healing-service error');
      }
      return mapResponseToCandidates(response);
    } catch (error) {
      const shouldFallback =
        options.fallbackToLocal ??
        (process.env.HEALING_SERVICE_FALLBACK_LOCAL === '1' || process.env.HEALING_SERVICE_FALLBACK_LOCAL === 'true');

      if (shouldFallback && options.localDiscoverer) {
        return options.localDiscoverer({ page, actionType, attempts });
      }
      throw error;
    }
  };
}

export function isHealingServiceEnabled(): boolean {
  return Boolean(resolveServiceUrl());
}
