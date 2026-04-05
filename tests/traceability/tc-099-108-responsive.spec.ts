import { healingClick, healingExpectVisible, loginAsCustomer } from './_helpers';
import { addToCartStrategies, bodyVisibleStrategies, shippingCheckoutHeadingStrategies } from './strategies';
import { expect, test } from '../fixtures';

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

test.describe('Responsive (self-healing)', () => {
  test('TC-099 [Desktop] Layout stable', async ({ page }, testInfo) => {
    await page.setViewportSize(viewports.desktop);
    await page.goto('/login');
    await healingExpectVisible(page, testInfo, 'desktop-body', bodyVisibleStrategies());
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('TC-100 [Tablet] Layout adapts', async ({ page }, testInfo) => {
    await page.setViewportSize(viewports.tablet);
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingExpectVisible(page, testInfo, 'tablet-main', [
      { name: 'main', resolve: (p) => p.locator('main') },
    ]);
  });

  test('TC-101 [Mobile] Core journey', async ({ page }, testInfo) => {
    await page.setViewportSize(viewports.mobile);
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await healingClick(page, testInfo, 'mobile-add-to-cart', addToCartStrategies());
    await page.goto('/app/cart');
    await expect(page).toHaveURL(/\/app\/cart/);
  });

  test('TC-102 [Landscape] Mobile landscape', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/login');
    await healingExpectVisible(page, testInfo, 'landscape-body', bodyVisibleStrategies());
  });

  test('TC-103 [Touch] Tap targets', async ({ page }, testInfo) => {
    await page.setViewportSize(viewports.mobile);
    await loginAsCustomer(page, testInfo);
    await healingClick(page, testInfo, 'touch-add-to-cart', addToCartStrategies());
    await healingExpectVisible(page, testInfo, 'touch-body', bodyVisibleStrategies());
  });

  test('TC-105 [Orientation] State on rotate', async ({ page }, testInfo) => {
    await page.setViewportSize(viewports.mobile);
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/checkout');
    await page.setViewportSize({ width: 844, height: 390 });
    await healingExpectVisible(page, testInfo, 'checkout-after-rotate', shippingCheckoutHeadingStrategies());
  });

  test('TC-106 [Zoom] 200% zoom usability', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    await healingExpectVisible(page, testInfo, 'zoom-email', [
      { name: 'label-email', resolve: (p) => p.getByLabel(/email/i) },
    ]);
  });

  test('TC-107 [Overflow] No horizontal scroll', async ({ page }) => {
    await page.goto('/login');
    const w = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(w.sw).toBeLessThanOrEqual(w.cw + 1);
  });
});
