import type { DomElementSnapshot } from '../core/discovery/dom-scan-discovery';
import type { GeneratedLocatorQuery, HealingActionType } from '../core/healing-types';

/** Standardized healing request (SDK → healing-service). */
export type HealingRequest = {
  framework: 'playwright' | 'cypress' | 'selenium' | 'webdriverio' | string;
  action: HealingActionType;
  failedLocator: string;
  error: string;
  url: string;
  pageTitle?: string;
  screenshotPath?: string;
  /** Structured DOM inventory captured by the SDK before the request. */
  domSnapshot?: DomElementSnapshot[];
  /** Combined failure hints from prior strategy attempts. */
  failureHints?: string;
  metadata?: Record<string, unknown>;
};

export type HealingResponseCandidate = {
  query: GeneratedLocatorQuery;
  /** Human-readable locator for reports (e.g. role=button[name="Sign in"]). */
  healedLocator: string;
  confidence: number;
  strategy: string;
  reasoning: string;
  score: number;
};

/** Standardized healing response (healing-service → SDK). */
export type HealingResponse = {
  status: 'healed' | 'no_match' | 'error';
  healedLocator?: string;
  confidence?: number;
  strategy?: string;
  reasoning?: string;
  candidates?: HealingResponseCandidate[];
  error?: string;
};

export function formatLocatorQuery(query: GeneratedLocatorQuery): string {
  if (query.type === 'css') return query.value;
  return `role=${query.role}[name="${query.name}"]`;
}

export function confidenceFromScore(score: number): number {
  return Math.min(1, Math.max(0, score / 100));
}
