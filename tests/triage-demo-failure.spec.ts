import { expect, test } from './fixtures';

/**
 * Intentional failure so the unified dashboard can triage an open defect.
 * Not included in `npm run test:healing-showcases`.
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
});
