import type { AutonomousJourneyDefinition } from 'autonomous-agent-contracts';

/** Secret-safe goal templates — credentials injected from env at runtime (Phase 10). */
export const AUTONOMOUS_GOAL_TEMPLATES = {
  login: 'Log in with {{CUSTOMER_EMAIL}} / {{CUSTOMER_PASSWORD}} and leave the login page.',
  checkout:
    'Log in with {{CUSTOMER_EMAIL}} / {{CUSTOMER_PASSWORD}}, add the first product to cart, and reach checkout.',
  placeOrder:
    'Log in with {{CUSTOMER_EMAIL}} / {{CUSTOMER_PASSWORD}}, add to cart, reach checkout, and place order.',
} as const;

/** Phase 9 — Nova Retail evaluation set (10 NL goals for plan coverage / staging runs). */
export const NOVA_RETAIL_EVALUATION_JOURNEYS = [
  {
    id: 'j01-login',
    goal: 'Log in with test@demo.com / password123 and leave the login page.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 5,
  },
  {
    id: 'j02-login-short',
    goal: 'Sign in as test@demo.com / password123',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 4,
  },
  {
    id: 'j03-products-after-login',
    goal: 'Log in with test@demo.com / password123 and open the products catalog.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 6,
  },
  {
    id: 'j04-add-to-cart',
    goal: 'Log in with test@demo.com / password123, add the first product to cart.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 8,
  },
  {
    id: 'j05-view-cart',
    goal: 'Log in with test@demo.com / password123, add to cart, and go to cart.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 10,
  },
  {
    id: 'j06-reach-checkout',
    goal: 'Log in with test@demo.com / password123, add the first product to cart, and reach checkout.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 12,
  },
  {
    id: 'j07-checkout-keywords',
    goal: 'Login test@demo.com / password123 then checkout with an item in cart.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 12,
  },
  {
    id: 'j08-storefront-browse',
    goal: 'Log in with test@demo.com / password123 and browse the storefront products page.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 6,
  },
  {
    id: 'j09-cart-verify',
    goal: 'Log in with test@demo.com / password123, add product to cart, verify cart has items.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 10,
  },
  {
    id: 'j10-place-order',
    goal: 'Log in with test@demo.com / password123, add to cart, reach checkout, and place order.',
    startUrl: '/login',
    expectPlanner: 'mock-autonomous-planner-v2',
    minSteps: 14,
  },
] as const;

export type EvaluationJourney = (typeof NOVA_RETAIL_EVALUATION_JOURNEYS)[number];

/** Convert evaluation set to runnable journey definitions (Phase 13). */
export function toEvaluationJourneyDefinitions(): AutonomousJourneyDefinition[] {
  return NOVA_RETAIL_EVALUATION_JOURNEYS.map((j) => ({
    id: j.id,
    goal: j.goal,
    startUrl: j.startUrl,
    maxSteps: 30,
    timeoutPerActionMs: 25_000,
  }));
}

/** Phase 10 — CI smoke subset with env-injected credentials (no secrets in repo). */
export const AUTONOMOUS_CI_SMOKE_JOURNEYS: AutonomousJourneyDefinition[] = [
  {
    id: 'ci-smoke-login',
    goal: AUTONOMOUS_GOAL_TEMPLATES.login,
    startUrl: '/login',
    maxSteps: 25,
    timeoutPerActionMs: 30_000,
  },
  {
    id: 'ci-smoke-checkout',
    goal: AUTONOMOUS_GOAL_TEMPLATES.checkout,
    startUrl: '/login',
    maxSteps: 30,
    timeoutPerActionMs: 20_000,
  },
];
