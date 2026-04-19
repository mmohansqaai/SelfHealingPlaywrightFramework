import type { Page } from '@playwright/test';
import { getHistoryWeight } from './auto-heal-history';
import type { GeneratedLocatorCandidate, GeneratedLocatorQuery, HealingAttempt } from './healing-types';

export type AutoHealContext = {
  page: Page;
  actionType: 'click' | 'fill' | 'visible';
  attempts: HealingAttempt[];
};

type SeedCandidate = {
  query: GeneratedLocatorQuery;
  reason: string;
  baseScore: number;
};

function queryKey(query: GeneratedLocatorQuery): string {
  if (query.type === 'css') return `css:${query.value}`;
  return `role:${query.role}:${query.name}`;
}

function hasSignal(text: string, ...signals: string[]): boolean {
  const t = text.toLowerCase();
  return signals.some((s) => t.includes(s));
}

function buildSeedCandidates(ctx: AutoHealContext): SeedCandidate[] {
  const lastErrors = ctx.attempts
    .map((a) => [a.strategy, a.error ?? ''].join(' '))
    .join(' ')
    .toLowerCase();
  const seeds: SeedCandidate[] = [];

  if (hasSignal(lastErrors, 'email', 'mail')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="email"], input[name*="email" i], input[id*="email" i]' },
      reason: 'email-like input from failed strategy hints',
      baseScore: 90,
    });
  }

  if (hasSignal(lastErrors, 'password', 'pass')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="password"], input[name*="password" i], input[id*="password" i]' },
      reason: 'password-like input from failed strategy hints',
      baseScore: 90,
    });
  }

  // Auth-specific click hints (avoid using these for every click, or we may pick the wrong button later in a flow).
  if (hasSignal(lastErrors, 'sign in', 'signin', 'login', 'submit')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Sign in' },
      reason: 'primary auth button semantic fallback',
      baseScore: 88,
    });
    seeds.push({
      query: { type: 'css', value: 'button[type="submit"], input[type="submit"]' },
      reason: 'submit control fallback',
      baseScore: 80,
    });
  }

  // Commerce flow click hints (Nova Retail storefront).
  if (ctx.actionType === 'click' && hasSignal(lastErrors, 'add to cart', 'add-to-cart', 'add item', 'add-item')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Add to cart' },
      reason: 'storefront add-to-cart semantic fallback',
      baseScore: 92,
    });
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Add item' },
      reason: 'storefront add-item semantic fallback',
      baseScore: 86,
    });
  }

  if (ctx.actionType === 'click' && hasSignal(lastErrors, 'checkout')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Checkout' },
      reason: 'cart checkout semantic fallback',
      baseScore: 92,
    });
  }

  if (ctx.actionType === 'click' && hasSignal(lastErrors, 'place order', 'pay')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Pay' },
      reason: 'payment semantic fallback',
      baseScore: 86,
    });
  }

  if (ctx.actionType === 'visible') {
    seeds.push({
      query: { type: 'role', role: 'heading', name: 'Sign in to your workspace' },
      reason: 'semantic heading fallback for visibility checks',
      baseScore: 84,
    });
  }

  seeds.push({
    query: { type: 'css', value: '[data-testid], [aria-label], button, input, a' },
    reason: 'broad structural fallback as last resort',
    baseScore: 10,
  });

  return seeds;
}

function resolveQuery(page: Page, query: GeneratedLocatorQuery) {
  if (query.type === 'css') return page.locator(query.value).first();
  return page.getByRole(query.role, { name: new RegExp(query.name, 'i') }).first();
}

export async function discoverAutoHealingCandidates(ctx: AutoHealContext): Promise<GeneratedLocatorCandidate[]> {
  const pageUrl = (() => {
    try {
      return new URL(ctx.page.url()).pathname || '/';
    } catch {
      return '/';
    }
  })();

  const seeds = buildSeedCandidates(ctx);
  const out: GeneratedLocatorCandidate[] = [];

  for (const seed of seeds) {
    try {
      const loc = resolveQuery(ctx.page, seed.query);
      const count = await loc.count();
      if (count < 1) continue;

      const uniquenessBoost = count === 1 ? 10 : Math.max(0, 6 - count);
      const historyBoost = getHistoryWeight(pageUrl, ctx.actionType, queryKey(seed.query));
      const score = seed.baseScore + uniquenessBoost + historyBoost;

      out.push({
        strategyName: `autogen-${seed.query.type}-${out.length + 1}`,
        query: seed.query,
        score,
        reason: `${seed.reason}; count=${count}; history=${historyBoost}`,
      });
    } catch {
      // Ignore bad candidate and continue; this layer must be best-effort.
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 8);
}

export function generatedQueryToLocatorFactory(query: GeneratedLocatorQuery) {
  return (page: Page) => {
    if (query.type === 'css') return page.locator(query.value);
    return page.getByRole(query.role, { name: new RegExp(query.name, 'i') });
  };
}

export function generatedQueryKey(query: GeneratedLocatorQuery): string {
  return queryKey(query);
}
