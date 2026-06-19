import * as path from 'node:path';
import type { LocatorTargetMapping } from 'autonomous-qa-sdk';

/** Root of this Nova Retail QA package (examples/nova-retail-qa). */
export function resolveNovaRetailRoot(): string {
  if (process.env.NOVA_RETAIL_ROOT) return path.resolve(process.env.NOVA_RETAIL_ROOT);
  return path.resolve(__dirname, '..');
}

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
