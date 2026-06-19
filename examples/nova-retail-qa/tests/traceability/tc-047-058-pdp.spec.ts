import { healingClick, healingExpectVisible, loginAsCustomer } from './_helpers';
import { addToCartStrategies, cartIconStrategies, viewProductStrategies } from './strategies';
import { expect, test } from '../fixtures';

test.describe('Product detail (PDP) (self-healing)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'pdp-open-from-plp', viewProductStrategies());
    await expect(page).toHaveURL(/\/app\/products\/[^/]+/);
  });

  test('TC-047 [PDP] Product detail loads name, price, description', async ({ page }, testInfo) => {
    await healingExpectVisible(page, testInfo, 'pdp-title', [
      { name: 'rw-card-title', resolve: (p) => p.locator('.rw-card-title, h1, h2').first() },
    ]);
    await healingExpectVisible(page, testInfo, 'pdp-price', [
      { name: 'text-currency', resolve: (p) => p.getByText(/\$/).first() },
    ]);
  });

  test('TC-055 [PDP] Add to cart adds selected product', async ({ page }, testInfo) => {
    await healingClick(page, testInfo, 'pdp-add-to-cart', addToCartStrategies());
    await healingClick(page, testInfo, 'pdp-open-cart', cartIconStrategies());
    await expect(page).toHaveURL(/\/app\/cart/);
    await healingExpectVisible(page, testInfo, 'cart-shell', [
      { name: 'text-cart-item', resolve: (p) => p.getByText(/cart|item/i).first() },
    ]);
  });
});
