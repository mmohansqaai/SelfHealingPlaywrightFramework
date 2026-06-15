import type { AutonomousPlannedStep } from 'autonomous-agent-contracts';
import { isPlaceOrderGoal } from './goal-parser';

export function loginSteps(creds: { email: string; password: string }): AutonomousPlannedStep[] {
  return [
    {
      id: 'fill-email',
      action: { type: 'fill', targetHint: 'email input field', value: creds.email },
      reasoning: `Fill email ${creds.email} from parsed goal.`,
    },
    {
      id: 'fill-password',
      action: { type: 'fill', targetHint: 'password input field', value: creds.password },
      reasoning: 'Fill password from parsed goal.',
    },
    {
      id: 'click-sign-in',
      action: { type: 'click', targetHint: 'sign in button submit login' },
      reasoning: 'Click the sign-in / submit control to authenticate.',
    },
    {
      id: 'verify-left-login',
      action: { type: 'assert_url', mustNotMatch: '/login' },
      reasoning: 'Verify navigation away from the login page indicates success.',
    },
  ];
}

export function productsSteps(): AutonomousPlannedStep[] {
  return [
    {
      id: 'navigate-products',
      action: { type: 'navigate', url: '/app/products' },
      reasoning: 'Open the product catalog.',
    },
    {
      id: 'verify-products-heading',
      action: { type: 'assert_heading', textHint: 'Products|Catalog|Storefront' },
      reasoning: 'Verify the products page loaded.',
    },
  ];
}

export function addToCartSteps(): AutonomousPlannedStep[] {
  return [
    {
      id: 'click-add-to-cart',
      action: { type: 'click', targetHint: 'add to cart button first product' },
      reasoning: 'Add the first visible product to the cart.',
    },
    {
      id: 'wait-after-add',
      action: { type: 'wait', ms: 500 },
      reasoning: 'Allow cart state to update after add.',
    },
  ];
}

export function cartSteps(): AutonomousPlannedStep[] {
  return [
    {
      id: 'navigate-cart',
      action: { type: 'navigate', url: '/app/cart' },
      reasoning: 'Open the shopping cart.',
    },
    {
      id: 'verify-cart-items',
      action: { type: 'assert_text', textHint: 'cart|item|total' },
      reasoning: 'Verify the cart shows line items or total.',
    },
  ];
}

export function reachCheckoutSteps(): AutonomousPlannedStep[] {
  return [
    {
      id: 'click-cart-checkout',
      action: { type: 'click', targetHint: 'checkout button cart' },
      reasoning: 'Proceed from cart to checkout.',
    },
    {
      id: 'verify-checkout-url',
      action: { type: 'assert_url', mustMatch: '/checkout' },
      reasoning: 'Verify checkout page URL.',
    },
    {
      id: 'verify-checkout-heading',
      action: { type: 'assert_heading', textHint: 'Checkout|Shipping|Order' },
      reasoning: 'Verify checkout UI is visible.',
    },
  ];
}

export function placeOrderSteps(): AutonomousPlannedStep[] {
  return [
    {
      id: 'click-place-order',
      action: { type: 'click', targetHint: 'pay place order button checkout' },
      reasoning: 'Submit payment / place order.',
    },
    {
      id: 'verify-order-confirmed',
      action: { type: 'assert_text', textHint: 'confirmed|success|thank you' },
      reasoning: 'Verify order confirmation message.',
    },
  ];
}

/** Build checkout journey steps after optional login block. */
export function checkoutJourneySteps(goal: string, includeLogin: boolean, creds?: { email: string; password: string }): AutonomousPlannedStep[] {
  const steps: AutonomousPlannedStep[] = [];

  if (includeLogin && creds) {
    steps.push(...loginSteps(creds));
  }

  steps.push(...productsSteps(), ...addToCartSteps(), ...cartSteps(), ...reachCheckoutSteps());

  if (isPlaceOrderGoal(goal)) {
    steps.push(...placeOrderSteps());
  }

  steps.push({
    id: 'complete',
    action: {
      type: 'complete',
      message: isPlaceOrderGoal(goal)
        ? 'Checkout journey completed — order placed.'
        : 'Checkout journey completed — reached checkout page.',
    },
    reasoning: 'Goal satisfied.',
  });

  return steps;
}
