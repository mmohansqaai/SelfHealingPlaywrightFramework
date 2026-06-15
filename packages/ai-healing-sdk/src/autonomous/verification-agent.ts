import type { Page } from '@playwright/test';
import type { AutonomousVerificationRecord } from 'autonomous-agent-contracts';

/** Phase 9 — lightweight verification checks after key milestones. */
export async function runVerificationAgent(page: Page, goal: string): Promise<AutonomousVerificationRecord[]> {
  const checks: AutonomousVerificationRecord[] = [];
  const path = (() => {
    try {
      return new URL(page.url()).pathname;
    } catch {
      return page.url();
    }
  })();
  const bodyText = await page.locator('body').innerText().catch(() => '');

  checks.push({
    checkId: 'url-present',
    passed: path.length > 0,
    detail: `Current path: ${path}`,
  });

  if (goal.toLowerCase().includes('checkout')) {
    checks.push({
      checkId: 'checkout-or-cart-path',
      passed: /\/app\/(checkout|cart)/.test(path),
      detail: path.includes('/checkout') ? 'On checkout page' : `Path ${path} (expected checkout or cart)`,
    });
  }

  if (goal.toLowerCase().includes('cart')) {
    checks.push({
      checkId: 'cart-signal',
      passed: /cart|item|total/i.test(bodyText),
      detail: /cart|item|total/i.test(bodyText) ? 'Cart-related text found' : 'No cart signal in page text',
    });
  }

  if (goal.toLowerCase().includes('product')) {
    checks.push({
      checkId: 'products-signal',
      passed: /product|catalog|storefront/i.test(bodyText),
      detail: /product|catalog|storefront/i.test(bodyText) ? 'Products signal found' : 'No products signal',
    });
  }

  return checks;
}

export function summarizeVerifications(records: AutonomousVerificationRecord[]): string {
  const failed = records.filter((r) => !r.passed);
  if (failed.length === 0) return `All ${records.length} verification checks passed`;
  return `${failed.length}/${records.length} checks failed: ${failed.map((f) => f.checkId).join(', ')}`;
}
