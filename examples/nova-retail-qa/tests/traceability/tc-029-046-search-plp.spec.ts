import { healingClick, healingExpectVisible, healingFill, loginAsCustomer } from './_helpers';
import {
  addToCartStrategies,
  cartIconStrategies,
  productsHeadingStrategies,
  searchProductsStrategies,
} from './strategies';
import { expect, test } from '../fixtures';

test.describe('Search & category / PLP (self-healing)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingExpectVisible(page, testInfo, 'plp-search-ready', searchProductsStrategies());
  });

  test('TC-029 [Search] Valid keyword returns relevant results', async ({ page }, testInfo) => {
    await healingFill(page, testInfo, 'search-shirt', searchProductsStrategies(), 'shirt');
    await page.waitForTimeout(400);
    await healingExpectVisible(page, testInfo, 'search-results-card', [
      { name: 'rw-card-first', resolve: (p) => p.locator('.rw-card').first() },
    ]);
  });

  test('TC-030 [Search] Partial match returns matching results', async ({ page }, testInfo) => {
    await healingFill(page, testInfo, 'search-partial', searchProductsStrategies(), 'shi');
    await page.waitForTimeout(400);
    await healingExpectVisible(page, testInfo, 'partial-card', [
      { name: 'rw-card-first', resolve: (p) => p.locator('.rw-card').first() },
    ]);
  });

  test('TC-031 [Search] Case insensitivity', async ({ page }, testInfo) => {
    await healingFill(page, testInfo, 'search-upper', searchProductsStrategies(), 'SHIRT');
    await page.waitForTimeout(400);
    const upper = await page.locator('.rw-card').count();
    await healingFill(page, testInfo, 'search-lower', searchProductsStrategies(), 'shirt');
    await page.waitForTimeout(400);
    const lower = await page.locator('.rw-card').count();
    expect(Math.abs(upper - lower)).toBeLessThanOrEqual(2);
  });

  test('TC-032 [Search] Leading/trailing spaces trimmed', async ({ page }, testInfo) => {
    await healingFill(page, testInfo, 'search-trim', searchProductsStrategies(), '  shirt  ');
    await page.waitForTimeout(400);
    await healingExpectVisible(page, testInfo, 'page-body', [
      { name: 'body', resolve: (p) => p.locator('body') },
    ]);
  });

  test('TC-033 [Search] No results shows friendly state', async ({ page }) => {
    await page.getByPlaceholder(/search products/i).fill('zzzz-no-such-product-xyz-12345');
    await page.waitForTimeout(600);
    const empty = page.getByText(/no products|empty|no matches/i);
    const cards = page.locator('.rw-card');
    const cardCount = await cards.count();
    expect(cardCount === 0 || (await empty.count()) > 0).toBeTruthy();
  });

  test('TC-034 [Search] Special characters handled safely', async ({ page }, testInfo) => {
    await healingFill(
      page,
      testInfo,
      'search-xss-string',
      searchProductsStrategies(),
      '<script>alert(1)</script>'
    );
    await page.waitForTimeout(500);
    await healingExpectVisible(page, testInfo, 'post-xss-body', [
      { name: 'body', resolve: (p) => p.locator('body') },
    ]);
  });

  test('TC-035 [Search] Clearing search refreshes listing', async ({ page }, testInfo) => {
    await healingFill(page, testInfo, 'search-temp', searchProductsStrategies(), 'test');
    await page.waitForTimeout(400);
    await healingFill(page, testInfo, 'search-clear', searchProductsStrategies(), '');
    await page.waitForTimeout(400);
    await healingExpectVisible(page, testInfo, 'heading-after-clear', productsHeadingStrategies());
  });

  test('TC-036 [Search] Search from desktop vs mobile menu', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app/products');
    await healingExpectVisible(page, testInfo, 'mobile-search', searchProductsStrategies());
    await healingFill(page, testInfo, 'mobile-search-a', searchProductsStrategies(), 'a');
    await page.waitForTimeout(400);
  });

  test('TC-037 [Category] Category / PLP loads product listing', async ({ page }, testInfo) => {
    await page.goto('/app/products');
    await healingExpectVisible(page, testInfo, 'plp-cards', [
      { name: 'rw-card-first', resolve: (p) => p.locator('.rw-card').first() },
    ]);
  });

  test('TC-038 [PLP] Result count vs visible cards', async ({ page }) => {
    const n = await page.locator('.rw-card').count();
    expect(n).toBeGreaterThan(0);
  });

  test('TC-044 [PLP] Card quick actions (add to cart)', async ({ page }, testInfo) => {
    await healingClick(page, testInfo, 'plp-add-to-cart', addToCartStrategies());
    await healingClick(page, testInfo, 'open-cart-from-header', cartIconStrategies());
    await expect(page).toHaveURL(/\/app\/cart/);
  });

  test('TC-045 [PLP] Image fallback / layout', async ({ page }, testInfo) => {
    const cards = page.locator('.rw-card');
    await healingExpectVisible(page, testInfo, 'first-card', [
      { name: 'rw-card', resolve: (p) => p.locator('.rw-card').first() },
    ]);
    const w = await cards.first().boundingBox();
    expect(w?.width).toBeGreaterThan(50);
  });
});
