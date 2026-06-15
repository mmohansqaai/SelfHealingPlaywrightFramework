import type { AutonomousPlannedStep, AutonomousReplanRequest } from 'autonomous-agent-contracts';

function recoveryNavigate(url: string, id: string, reasoning: string): AutonomousPlannedStep {
  return { id, action: { type: 'navigate', url }, reasoning };
}

/**
 * Phase 9 — deterministic replan when an assertion fails (mock verification agent).
 */
export function replanAfterAssertionFailure(request: AutonomousReplanRequest): AutonomousPlannedStep[] {
  const { failedStepId, failedAction, pageUrl, goal } = request;
  const path = (() => {
    try {
      return new URL(pageUrl).pathname;
    } catch {
      return pageUrl;
    }
  })();

  if (failedAction.type === 'assert_url' && failedAction.mustMatch?.includes('checkout')) {
    if (path.includes('/cart')) {
      return [
        {
          id: `replan-${failedStepId}-retry-checkout`,
          action: { type: 'click', targetHint: 'checkout button cart' },
          reasoning: 'Replan: still on cart — retry checkout click.',
        },
        {
          id: `replan-${failedStepId}-retry-assert-checkout`,
          action: { type: 'assert_url', mustMatch: '/checkout' },
          reasoning: 'Replan: re-verify checkout URL.',
        },
      ];
    }
    if (!path.includes('/app/products') && goal.toLowerCase().includes('cart')) {
      return [
        recoveryNavigate('/app/cart', `replan-${failedStepId}-goto-cart`, 'Replan: navigate to cart before checkout.'),
        {
          id: `replan-${failedStepId}-retry-checkout`,
          action: { type: 'click', targetHint: 'checkout button cart' },
          reasoning: 'Replan: proceed to checkout from cart.',
        },
        {
          id: `replan-${failedStepId}-retry-assert-checkout`,
          action: { type: 'assert_url', mustMatch: '/checkout' },
          reasoning: 'Replan: re-verify checkout URL.',
        },
      ];
    }
  }

  if (failedAction.type === 'assert_url' && failedAction.mustNotMatch?.includes('login')) {
    return [
      {
        id: `replan-${failedStepId}-retry-sign-in`,
        action: { type: 'click', targetHint: 'sign in button submit login' },
        reasoning: 'Replan: still on login — retry sign in.',
      },
      {
        id: `replan-${failedStepId}-retry-assert-left-login`,
        action: { type: 'assert_url', mustNotMatch: '/login' },
        reasoning: 'Replan: re-verify left login page.',
      },
    ];
  }

  if (failedAction.type === 'assert_text' && failedStepId.includes('cart')) {
    return [
      recoveryNavigate('/app/products', `replan-${failedStepId}-goto-products`, 'Replan: cart empty — return to products.'),
      {
        id: `replan-${failedStepId}-retry-add`,
        action: { type: 'click', targetHint: 'add to cart button first product' },
        reasoning: 'Replan: add product again.',
      },
      recoveryNavigate('/app/cart', `replan-${failedStepId}-goto-cart`, 'Replan: open cart after re-add.'),
      {
        id: `replan-${failedStepId}-retry-cart-assert`,
        action: { type: 'assert_text', textHint: 'cart|item|total' },
        reasoning: 'Replan: re-verify cart contents.',
      },
    ];
  }

  if (failedAction.type === 'assert_heading' || failedAction.type === 'assert_visible') {
    if (path.includes('/products') || goal.toLowerCase().includes('product')) {
      return [
        recoveryNavigate('/app/products', `replan-${failedStepId}-goto-products`, 'Replan: reload products page.'),
        {
          id: `replan-${failedStepId}-retry-heading`,
          action: { type: 'assert_heading', textHint: 'Products|Catalog|Storefront' },
          reasoning: 'Replan: re-verify products heading.',
        },
      ];
    }
  }

  return [];
}

export function isAssertionAction(action: AutonomousPlannedStep['action']): boolean {
  return (
    action.type === 'assert_url' ||
    action.type === 'assert_visible' ||
    action.type === 'assert_heading' ||
    action.type === 'assert_text'
  );
}
