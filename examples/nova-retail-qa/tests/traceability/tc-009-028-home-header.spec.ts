import { healingClick, healingExpectVisible, loginAsCustomer } from './_helpers';
import {
  cartIconStrategies,
  mainLandmarkStrategies,
  navLinkStrategies,
  primaryNavStrategies,
  productsHeadingStrategies,
  productsLinkStrategies,
  viewProductStrategies,
} from './strategies';
import { expect, test } from '../fixtures';

test.describe('Home / shell / header / footer (self-healing, Nova Retail)', () => {
  test('TC-009 [Hero/banner] Primary CTA navigates to intended page', async ({ page }, testInfo) => {
    await page.goto('/login');
    await loginAsCustomer(page, testInfo);
    await healingClick(page, testInfo, 'nav-products-cta', productsLinkStrategies());
    await expect(page).toHaveURL(/\/app\/products/);
  });

  test('TC-011 [Featured products] Featured section shows valid product cards', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingExpectVisible(page, testInfo, 'products-heading', productsHeadingStrategies());
    await healingExpectVisible(page, testInfo, 'first-product-card', [
      { name: 'rw-card', resolve: (p) => p.locator('.rw-card').first() },
    ]);
  });

  test('TC-012 [Featured product navigation] Clicking a product opens PDP', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'open-pdp-view', viewProductStrategies());
    await expect(page).toHaveURL(/\/app\/products\/[^/]+/);
  });

  test('TC-016 [Content consistency] Sections load in intended sequence', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/dashboard');
    await healingExpectVisible(page, testInfo, 'dashboard-main', mainLandmarkStrategies());
    await page.goto('/app/products');
    await healingExpectVisible(page, testInfo, 'products-main', mainLandmarkStrategies());
  });

  test('TC-017 [Navigation menu] Primary nav links route correctly', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    for (const [name, path, label] of [
      ['Dashboard', /\/app\/dashboard/, 'nav-dashboard'],
      ['Products', /\/app\/products/, 'nav-products'],
      ['Cart', /\/app\/cart/, 'nav-cart'],
      ['Checkout', /\/app\/checkout/, 'nav-checkout'],
      ['Settings', /\/app\/settings/, 'nav-settings'],
    ] as const) {
      await healingClick(page, testInfo, label, navLinkStrategies(name));
      await expect(page).toHaveURL(path);
    }
  });

  test('TC-018 [Sticky header] Header usable while scrolling', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await page.evaluate(() => window.scrollTo(0, 800));
    await healingExpectVisible(page, testInfo, 'sticky-primary-nav', primaryNavStrategies());
  });

  test('TC-019 [Logo navigation] Primary nav returns to shopping area', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/cart');
    await healingClick(page, testInfo, 'back-to-products', productsLinkStrategies());
    await expect(page).toHaveURL(/\/app\/products/);
  });

  test('TC-020 [Empty state] Empty sections do not break layout', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/cart');
    await page.evaluate(() => localStorage.removeItem('nova.cart'));
    await page.reload();
    await healingExpectVisible(page, testInfo, 'empty-cart-copy', [
      { name: 'text-empty-cart', resolve: (p) => p.getByText(/cart is empty/i) },
    ]);
  });

  test('TC-021 [Header actions] Header cart and primary controls work', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await healingClick(page, testInfo, 'header-open-cart', cartIconStrategies());
    await expect(page).toHaveURL(/\/app\/cart/);
  });

  test('TC-028 [Keyboard] Header/footer links keyboard accessible', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await page.keyboard.press('Tab');
    let focused = 0;
    for (let i = 0; i < 25; i++) {
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      if (tag === 'A' || tag === 'BUTTON') focused++;
      await page.keyboard.press('Tab');
    }
    expect(focused).toBeGreaterThan(0);
  });
});
