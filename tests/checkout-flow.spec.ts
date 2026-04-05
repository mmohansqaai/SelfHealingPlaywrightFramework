import { attachHealingSummary } from '../core/healing-reporter';
import { expect, test } from './fixtures';

test.describe('Retail checkout (self-healing)', () => {
  test('customer logs in and completes checkout', async ({ page, loginPage: login, retailJourney: journey }, testInfo) => {
    test.setTimeout(120_000);

    await login.goto();
    await login.expectLoaded();
    await login.loginAsCustomer();
    // SPA navigation after Sign in can exceed the default 5s used by expect().not.toHaveURL
    await page.waitForURL(/\/app(\/|$)/, { timeout: 25_000 });
    const { products, addToCart, checkout, pay, confirmed } = await journey.completeCheckoutAfterLogin();

    await attachHealingSummary(testInfo, 'products-heading', products);
    await attachHealingSummary(testInfo, 'add-to-cart', addToCart);
    await attachHealingSummary(testInfo, 'cart-checkout', checkout);
    await attachHealingSummary(testInfo, 'pay', pay);
    await attachHealingSummary(testInfo, 'order-confirmed', confirmed);

    expect(confirmed.usedStrategy).toBeTruthy();
    await expect(page.getByText(/confirmed/i).first()).toBeVisible();
  });
});
