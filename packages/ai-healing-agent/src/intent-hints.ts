import type { HealingAttempt } from 'ai-healing-core';

export function hasSignal(text: string, ...signals: string[]): boolean {
  const t = text.toLowerCase();
  return signals.some((s) => t.includes(s.toLowerCase()));
}

export function failureHints(attempts: HealingAttempt[]): string {
  return attempts.map((a) => [a.strategy, a.error ?? ''].join(' ')).join(' ').toLowerCase();
}
