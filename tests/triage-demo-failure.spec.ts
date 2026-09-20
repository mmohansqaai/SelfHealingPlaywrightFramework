import { expect, test } from './fixtures';

/**
 * Intentional failures so unified-dashboard triage can classify different buckets.
 * Not included in `npm run test:healing-showcases`.
 *
 * - Missing heading → locator / element-not-found (automation)
 * - Wrong document title → Expected/Received assertion (product)
 * - Abort with connectionrefused → net::ERR_CONNECTION_REFUSED (environment / network)
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
});
