import { expect, test } from './fixtures';

/**
 * Intentional failures so unified-dashboard triage can classify different buckets.
 * Not included in `npm run test:healing-showcases`.
 *
 * - Missing heading → locator / element-not-found (automation)
 * - Wrong document title → Expected/Received assertion (product)
 * - Abort with connectionrefused → net::ERR_CONNECTION_REFUSED (environment / network)
 * - Mocked admin API 401 → 401 Unauthorized (auth / security)
 */
test.describe('Triage demo (intentional fail)', () => {
  test.describe.configure({ retries: 0 });

  test('home page shows checkout promo that does not exist @triage-demo-failure', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Flash checkout: everything $0.01' }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('document title still says Nova Retail @triage-demo-failure', async ({ page }) => {
    await page.goto('/');
    expect(await page.title()).toBe('Nova Retail');
  });

  test('product catalog request is connection-refused @triage-demo-failure', async ({ page }) => {
    await page.route('**/*', (route) => route.abort('connectionrefused'));
    await page.goto('/app/products', { waitUntil: 'commit', timeout: 8_000 });
  });

  test('admin restock API returns 401 Unauthorized @triage-demo-failure', async ({ page }) => {
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'text/plain',
        body: '401 Unauthorized\ninvalid or expired token',
      }),
    );
    await page.goto('/');
    await page.evaluate(async () => {
      const res = await fetch('/api/admin/products');
      if (!res.ok) {
        throw new Error(`401 Unauthorized: Request failed with status code ${res.status}`);
      }
    });
  });
});
