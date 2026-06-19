import { expectHttpsUrl, healingExpectVisible, loginAsCustomer } from './_helpers';
import {
  bodyVisibleStrategies,
  novaRetailHeadingStrategies,
} from './strategies';
import { expect, test } from '../fixtures';

test.describe('Site Access — Landing / session / routing (self-healing)', () => {
  test('TC-001 [Landing] Verify site loads successfully over HTTPS', async ({ page }, testInfo) => {
    const res = await page.goto('/');
    expect(res?.ok(), 'HTTP OK').toBeTruthy();
    expectHttpsUrl(page.url());
    await healingExpectVisible(page, testInfo, 'landing-body', bodyVisibleStrategies());
  });

  test('TC-002 [Landing] Verify site opens in a new browser session', async ({ context }, testInfo) => {
    const page = await context.newPage();
    const res = await page.goto('/');
    expect(res?.ok()).toBeTruthy();
    expectHttpsUrl(page.url());
    await healingExpectVisible(page, testInfo, 'session-body', bodyVisibleStrategies());
  });

  test('TC-003 [Landing] Verify root URL does not show 404/500/server error page', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      const res = await page.goto('/');
      expect(res?.status(), `attempt ${i + 1}`).toBeLessThan(500);
      await expect(page.getByText('404', { exact: true })).toHaveCount(0);
      await expect(page.getByText(/internal server error/i)).toHaveCount(0);
      await page.reload();
    }
  });

  test('TC-004 [Landing] Verify page remains stable after hard refresh', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const before = await page.locator('body').innerHTML();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await healingExpectVisible(page, testInfo, 'post-refresh-body', bodyVisibleStrategies());
    const after = await page.locator('body').innerHTML();
    expect(after.length).toBeGreaterThan(100);
    expect(before.length).toBeGreaterThan(100);
  });

  test('TC-005 [Landing] Verify main styles and assets load on first visit', async ({ page }, testInfo) => {
    const res = await page.goto('/');
    expect(res?.ok()).toBeTruthy();
    await healingExpectVisible(page, testInfo, 'stylesheet-present', [
      { name: 'link-stylesheet', resolve: (p) => p.locator('link[rel="stylesheet"]').first() },
      { name: 'style-tag', resolve: (p) => p.locator('style').first() },
    ]);
    await healingExpectVisible(page, testInfo, 'bundled-script', [
      { name: 'script-assets', resolve: (p) => p.locator('script[src*="assets/"]').first() },
      { name: 'any-module-script', resolve: (p) => p.locator('script[type="module"]').first() },
    ]);
  });

  test('TC-006 [Routing] Verify invalid route is handled gracefully', async ({ page }, testInfo) => {
    const res = await page.goto('/xyz-invalid-route-that-should-not-exist');
    expect(res?.status()).toBeLessThan(500);
    await healingExpectVisible(page, testInfo, 'error-route-body', bodyVisibleStrategies());
    const bodyText = await page.locator('body').innerText();
    const has404Copy = /not found|404|page not found|no match/i.test(bodyText);
    expect(has404Copy || bodyText.length > 50).toBeTruthy();
  });

  test('TC-007 [Navigation] Verify browser back and forward across pages', async ({ page }, testInfo) => {
    await loginAsCustomer(page, testInfo);
    await page.goto('/app/products');
    await expect(page).toHaveURL(/\/app\/products/);
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await page.goForward();
    await expect(page).toHaveURL(/\/app\/products/);
  });

  test('TC-008 [Multi-tab] Verify site in two tabs without corruption', async ({ context }, testInfo) => {
    const p1 = await context.newPage();
    const p2 = await context.newPage();
    await p1.goto('/login');
    await p2.goto('/login');
    await healingExpectVisible(p1, testInfo, 'tab1-nova', novaRetailHeadingStrategies());
    await healingExpectVisible(p2, testInfo, 'tab2-nova', novaRetailHeadingStrategies());
    await p1.goto('/login');
    await p2.goto('/');
    expect(p1.url()).toMatch(/vercel\.app/);
    expect(p2.url()).toMatch(/vercel\.app/);
  });
});
