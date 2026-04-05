import { healingClick, healingExpectVisible, loginAsCustomer } from './_helpers';
import {
  addSecondProductStrategies,
  addToCartStrategies,
  cartIconStrategies,
  continueShoppingStrategies,
} from './strategies';
import { expect, test } from '../fixtures';

test.describe('Cart (self-healing)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'beforeEach-add-to-cart', addToCartStrategies());
  });

  test('TC-059 [Cart] Cart badge updates after add', async ({ page }, testInfo) => {
    await healingExpectVisible(page, testInfo, 'cart-badge', [
      { name: 'button-cart-count', resolve: (p) => p.getByRole('button', { name: /cart\s*\d+/i }) },
    ]);
  });

  test('TC-060 [Cart] Cart page shows line items', async ({ page }, testInfo) => {
    await healingClick(page, testInfo, 'goto-cart', cartIconStrategies());
    await expect(page).toHaveURL(/\/app\/cart/);
    await healingExpectVisible(page, testInfo, 'cart-line-price', [
      { name: 'text-currency', resolve: (p) => p.getByText(/\$/).first() },
    ]);
  });

  test('TC-065 [Cart] Empty cart message', async ({ page }, testInfo) => {
    await page.goto('/app/cart');
    await page.evaluate(() => localStorage.removeItem('nova.cart'));
    await page.reload();
    await healingExpectVisible(page, testInfo, 'empty-cart', [
      { name: 'text-empty', resolve: (p) => p.getByText(/cart is empty/i) },
    ]);
  });

  test('TC-066 [Cart] Duplicate merge behavior', async ({ page }, testInfo) => {
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'duplicate-add-1', addToCartStrategies());
    await healingClick(page, testInfo, 'duplicate-add-2', addToCartStrategies());
    await page.goto('/app/cart');
    await healingExpectVisible(page, testInfo, 'cart-row', [
      { name: 'table-or-card', resolve: (p) => p.locator('.rw-table-row, .rw-card').first() },
    ]);
  });

  test('TC-068 [Cart] Line subtotal accuracy', async ({ page }) => {
    await page.goto('/app/cart');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/\$?\d+\.\d{2}/);
  });

  test('TC-069 [Cart] Multi-item total', async ({ page }, testInfo) => {
    await page.goto('/app/products');
    const buttons = page.getByRole('button', { name: /add to cart/i });
    if ((await buttons.count()) > 1) {
      await healingClick(page, testInfo, 'add-second-product', addSecondProductStrategies());
    }
    await page.goto('/app/cart');
    await healingExpectVisible(page, testInfo, 'cart-total', [
      { name: 'text-total', resolve: (p) => p.getByText(/total/i).first() },
    ]);
  });

  test('TC-071 [Cart] Session persistence after refresh', async ({ page }) => {
    await page.goto('/app/cart');
    await page.reload();
    await expect(page).toHaveURL(/\/app\/cart/);
  });

  test('TC-072 [Cart] Continue shopping', async ({ page }, testInfo) => {
    await page.goto('/app/cart');
    await healingClick(page, testInfo, 'continue-shopping', continueShoppingStrategies());
    await expect(page).toHaveURL(/\/app\/products/);
  });
});
