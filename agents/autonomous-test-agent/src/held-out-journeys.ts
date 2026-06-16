import type { AutonomousJourneyDefinition } from 'autonomous-agent-contracts';

/**
 * Phase 14 — held-out goals with paraphrased NL (not matched by mock planner templates).
 * Requires LLM planner — proves generalization beyond scripted plans.
 */
export const NOVA_RETAIL_HELD_OUT_JOURNEYS = [
  {
    id: 'h01-authenticate-dashboard',
    goal: 'Authenticate as test@demo.com with password password123 and reach the app dashboard (not the login screen).',
    startUrl: '/login',
    requiresLlm: true,
  },
  {
    id: 'h02-catalog-browse',
    goal: 'Using test@demo.com / password123, sign in and browse the product catalog page.',
    startUrl: '/login',
    requiresLlm: true,
  },
  {
    id: 'h03-basket-add',
    goal: 'After signing in as test@demo.com / password123, add any visible product to your shopping basket.',
    startUrl: '/login',
    requiresLlm: true,
  },
  {
    id: 'h04-payment-page',
    goal: 'As test@demo.com / password123, put an item in the cart and navigate to the payment checkout page.',
    startUrl: '/login',
    requiresLlm: true,
  },
  {
    id: 'h05-purchase-flow',
    goal: 'Complete user journey: test@demo.com / password123 login, add product, open cart, proceed to checkout.',
    startUrl: '/login',
    requiresLlm: true,
  },
] as const;

export type HeldOutJourney = (typeof NOVA_RETAIL_HELD_OUT_JOURNEYS)[number];

export function toHeldOutJourneyDefinitions(): AutonomousJourneyDefinition[] {
  return NOVA_RETAIL_HELD_OUT_JOURNEYS.map((j) => ({
    id: j.id,
    goal: j.goal,
    startUrl: j.startUrl,
    maxSteps: 35,
    timeoutPerActionMs: 30_000,
  }));
}
