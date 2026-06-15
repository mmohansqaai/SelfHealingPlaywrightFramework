import type { MaintenanceHealingSnapshot } from 'autonomous-agent-contracts';
import type { GeneratedLocatorCandidate } from '../core/healing-types';

export type LocatorTargetMapping = {
  filePath: string;
  methodName: string;
  actionKey: string;
};

/** Nova Retail — map autonomous target hints to page object strategy methods. */
export const NOVA_RETAIL_LOCATOR_TARGETS: Record<string, LocatorTargetMapping> = {
  'email input field': {
    filePath: 'pages/login.page.ts',
    methodName: 'emailStrategies',
    actionKey: 'login-email',
  },
  'password input field': {
    filePath: 'pages/login.page.ts',
    methodName: 'passwordStrategies',
    actionKey: 'login-password',
  },
  'sign in button submit login': {
    filePath: 'pages/login.page.ts',
    methodName: 'submitStrategies',
    actionKey: 'login-submit',
  },
  'add to cart button first product': {
    filePath: 'pages/retail-journey.page.ts',
    methodName: 'addToCartStrategies',
    actionKey: 'add-to-cart',
  },
  'checkout button cart': {
    filePath: 'pages/retail-journey.page.ts',
    methodName: 'cartCheckoutStrategies',
    actionKey: 'cart-checkout',
  },
  'pay place order button checkout': {
    filePath: 'pages/retail-journey.page.ts',
    methodName: 'payOrderStrategies',
    actionKey: 'place-order',
  },
};

export function resolveLocatorTarget(targetHint: string): LocatorTargetMapping | undefined {
  const key = targetHint.toLowerCase().trim();
  if (NOVA_RETAIL_LOCATOR_TARGETS[key]) return NOVA_RETAIL_LOCATOR_TARGETS[key];
  for (const [hint, mapping] of Object.entries(NOVA_RETAIL_LOCATOR_TARGETS)) {
    if (key.includes(hint) || hint.includes(key)) return mapping;
  }
  return undefined;
}

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
