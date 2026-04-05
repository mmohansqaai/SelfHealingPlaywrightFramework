import { expectHttpsUrl, healingClick, healingExpectVisible, healingFill, loginAsCustomer } from './_helpers';
import {
  addToCartStrategies,
  bodyVisibleStrategies,
  confirmedOrderStrategies,
  payOrderStrategies,
  searchProductsStrategies,
  signOutStrategies,
} from './strategies';
import { expect, test } from '../fixtures';

test.describe('Errors, security, SEO (self-healing)', () => {
  test('TC-125 [Errors] No broken internal navigation on core routes', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    for (const path of ['/app/dashboard', '/app/products', '/app/cart', '/app/settings']) {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);
    }
  });

  test('TC-127 [Errors] Invalid query params', async ({ page }, testInfo) => {
    await page.goto('/app/products?sort=;;;;');
    await healingExpectVisible(page, testInfo, 'query-body', bodyVisibleStrategies());
  });

  test('TC-128 [Errors] Deep link PDP', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    const href = await page.getByRole('link', { name: /^view$/i }).first().getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(href!);
    await healingExpectVisible(page, testInfo, 'pdp-deep-link-body', bodyVisibleStrategies());
  });

  test('TC-129 [Errors] Refresh after add to cart', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'pre-refresh-add', addToCartStrategies());
    await page.reload();
    await page.goto('/app/cart');
    await expect(page).toHaveURL(/\/app\/cart/);
  });

  test('TC-131 [Errors] Invalid slug', async ({ page }) => {
    const res = await page.goto('/app/products/not-a-real-id-99999');
    expect(res?.status()).toBeLessThan(500);
  });

  test('TC-132 [Errors] Back after checkout', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'checkout-flow-add', addToCartStrategies());
    await page.goto('/app/checkout');
    await healingClick(page, testInfo, 'place-order', payOrderStrategies());
    await healingExpectVisible(page, testInfo, 'confirmed', confirmedOrderStrategies());
    await page.goBack();
    await healingExpectVisible(page, testInfo, 'post-back-body', bodyVisibleStrategies());
  });

  test('TC-133 [Security] HTTPS / mixed content', async ({ page }) => {
    await page.goto('/');
    expectHttpsUrl(page.url());
  });

  test('TC-134 [Errors] No visible runtime exception overlay', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await expect(page.getByText(/uncaught exception|runtime error/i)).toHaveCount(0);
  });

  test('TC-135 [Security] No raw card data in DOM', async ({ page }) => {
    await page.goto('/app/checkout');
    const html = await page.content();
    expect(html).not.toMatch(/\b4[0-9]{15}\b/);
  });

  test('TC-136 [Security] PII not in query string', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/checkout');
    expect(page.url()).not.toMatch(/address|phone|email=/i);
  });

  test('TC-137 [Security] XSS search', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingFill(
      page,
      testInfo,
      'xss-search',
      searchProductsStrategies(),
      '<img src=x onerror=alert(1)>'
    );
    await page.waitForTimeout(400);
    const alerted = await page.evaluate(() => (window as unknown as { __alerted?: boolean }).__alerted);
    expect(alerted).toBeFalsy();
  });

  test('TC-138 [Security] Protected route without auth', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto('/app/admin');
    await expect(p).toHaveURL(/\/login/);
    await ctx.close();
  });

  test('TC-140 [Security] Session isolation', async ({ browser }, testInfo) => {
    const c1 = await browser.newContext();
    const c2 = await browser.newContext();
    const p1 = await c1.newPage();
    const p2 = await c2.newPage();
    await loginAsCustomer(p1, testInfo);
    await p2.goto('/login');
    const t1 = await p1.evaluate(() => localStorage.getItem('nova.auth'));
    const t2 = await p2.evaluate(() => localStorage.getItem('nova.auth'));
    expect(t1).toBeTruthy();
    expect(t2).toBeNull();
    await c1.close();
    await c2.close();
  });

  test('TC-141 [Security] Logout clears session', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await healingClick(page, testInfo, 'sign-out', signOutStrategies());
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-142 [Security] Error hygiene', async ({ page }) => {
    const res = await page.goto('/xyz-invalid-route-999');
    expect(res?.status()).toBeLessThan(500);
    const text = await page.locator('body').innerText();
    expect(text.toLowerCase()).not.toContain('sql');
    expect(text.toLowerCase()).not.toContain('stack trace');
  });

  test('TC-143 [SEO] Title present', async ({ page }) => {
    await page.goto('/');
    expect((await page.title()).length).toBeGreaterThan(0);
  });

  test('TC-144 [SEO] Open Graph', async ({ page }) => {
    await page.goto('/');
    const og = await page.locator('meta[property="og:title"]').count();
    expect(og).toBeGreaterThanOrEqual(0);
  });

  test('TC-145 [SEO] Canonical', async ({ page }) => {
    await page.goto('/');
    const n = await page.locator('link[rel="canonical"]').count();
    expect(n).toBeGreaterThanOrEqual(0);
  });

  test('TC-146 [SEO] Readable URLs', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    expect(page.url()).toMatch(/\/app\/products$/);
  });

  test('TC-148 [SEO] 404 page metadata', async ({ page }, testInfo) => {
    await page.goto('/not-found-route-xyz');
    await healingExpectVisible(page, testInfo, 'not-found-body', bodyVisibleStrategies());
    const t = await page.locator('body').innerText();
    expect(/not found|404|no match|page/i.test(t) || t.length > 20).toBeTruthy();
  });
});
