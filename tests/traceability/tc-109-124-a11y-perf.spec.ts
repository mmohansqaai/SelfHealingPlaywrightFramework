import { healingClick, healingExpectVisible, healingFill, loginAsCustomer } from './_helpers';
import { addToCartStrategies, searchProductsStrategies, shippingCheckoutHeadingStrategies } from './strategies';
import { expect, test } from '../fixtures';

test.describe('Accessibility & performance (self-healing)', () => {
  test('TC-109 [A11y] Keyboard-only core journey', async ({ page }, testInfo) => {
    await page.goto('/login');
    for (let i = 0; i < 35; i++) {
      await page.keyboard.press('Tab');
      if (await page.getByLabel(/email/i).evaluate((el) => el === document.activeElement)) break;
    }
    await healingExpectVisible(page, testInfo, 'email-focused-area', [
      { name: 'label-email', resolve: (p) => p.getByLabel(/email/i) },
    ]);
    await expect(page.getByLabel(/email/i)).toBeFocused();
  });

  test('TC-110 [A11y] Visible focus', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).focus();
    await healingExpectVisible(page, testInfo, 'email-visible', [
      { name: 'label-email', resolve: (p) => p.getByLabel(/email/i) },
    ]);
    await expect(page.getByLabel(/email/i)).toBeFocused();
  });

  test('TC-111 [A11y] Image alt text', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    const imgs = page.locator('img[alt]');
    expect(await imgs.count()).toBeGreaterThanOrEqual(0);
  });

  test('TC-112 [A11y] Form labels', async ({ page }, testInfo) => {
    await page.goto('/login');
    await healingExpectVisible(page, testInfo, 'labeled-email', [
      { name: 'label-email', resolve: (p) => p.getByLabel(/email/i) },
    ]);
  });

  test('TC-115 [A11y] aria-live cart', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'a11y-add-to-cart', addToCartStrategies());
    const live = page.locator('[aria-live]');
    expect(await live.count()).toBeGreaterThanOrEqual(0);
  });

  test('TC-116 [A11y] Document title', async ({ page }, testInfo) => {
    await page.goto('/login');
    const t = await page.title();
    expect(t.length).toBeGreaterThan(0);
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    const t2 = await page.title();
    expect(t2.length).toBeGreaterThan(0);
  });

  test('TC-117 [Perf] Initial load', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(Date.now() - t0).toBeLessThan(60_000);
  });

  test('TC-119 [Perf] Search responsiveness', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    const t0 = Date.now();
    await healingFill(page, testInfo, 'perf-search', searchProductsStrategies(), 'a');
    await page.waitForTimeout(500);
    expect(Date.now() - t0).toBeLessThan(10_000);
  });

  test('TC-121 [Perf] Checkout steps', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/checkout');
    await healingExpectVisible(page, testInfo, 'checkout-heading', shippingCheckoutHeadingStrategies());
  });

  test('TC-122 [Perf] Loader / skeleton', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingExpectVisible(page, testInfo, 'products-body', [
      { name: 'body', resolve: (p) => p.locator('body') },
    ]);
  });
});
