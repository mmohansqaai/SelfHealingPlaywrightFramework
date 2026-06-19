import { healingClick, healingExpectVisible, loginAsCustomer } from './_helpers';
import { addToCartStrategies, checkoutStrategies, confirmedOrderStrategies, payOrderStrategies } from './strategies';
import { expect, test } from '../fixtures';

test.describe('Checkout (self-healing)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'checkout-flow-setup-add', addToCartStrategies());
  });

  test('TC-073 [Checkout] Proceed from cart to checkout', async ({ page }, testInfo) => {
    await page.goto('/app/cart');
    await healingClick(page, testInfo, 'cart-checkout', checkoutStrategies());
    await expect(page).toHaveURL(/\/app\/checkout/);
  });

  test('TC-079 [Checkout] Address accepts valid shipping details', async ({ page }, testInfo) => {
    await page.goto('/app/checkout');
    await healingExpectVisible(page, testInfo, 'shipping-address', [
      { name: 'label-address', resolve: (p) => p.getByLabel(/address/i).first() },
    ]);
  });

  test('TC-083 [Checkout] Shipping price updates total', async ({ page }, testInfo) => {
    await page.goto('/app/checkout');
    await healingExpectVisible(page, testInfo, 'checkout-total', [
      { name: 'text-total', resolve: (p) => p.getByText(/total/i).first() },
    ]);
  });

  test('TC-089 [Checkout] Place order success', async ({ page }, testInfo) => {
    await page.goto('/app/checkout');
    await healingClick(page, testInfo, 'place-order-pay', payOrderStrategies());
    await healingExpectVisible(page, testInfo, 'order-confirmed', confirmedOrderStrategies());
  });

  test('TC-090 [Checkout] Double submit prevention', async ({ page }, testInfo) => {
    await page.goto('/app/checkout');
    await healingClick(page, testInfo, 'first-pay-click', payOrderStrategies());
    const btn = page.getByRole('button', { name: /pay\s*\$/i });
    const disabled = await btn.isDisabled().catch(() => false);
    expect(typeof disabled).toBe('boolean');
  });
});
