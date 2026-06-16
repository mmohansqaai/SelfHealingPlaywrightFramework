import type { Page } from '@playwright/test';
import type { AutonomousPageState, AutonomousStepTrace } from 'autonomous-agent-contracts';
import { runLlmVerificationAgent } from 'autonomous-test-agent';
import type { AutonomousVerificationRecord } from 'autonomous-agent-contracts';

export type VerificationAgentOptions = {
  plannerMode?: 'mock' | 'llm';
  pageState?: AutonomousPageState;
  trace?: AutonomousStepTrace[];
  llmVerification?: boolean;
};

/** Phase 9 + 14 — rule-based checks plus optional LLM goal verification. */
export async function runVerificationAgent(
  page: Page,
  goal: string,
  options: VerificationAgentOptions = {}
): Promise<AutonomousVerificationRecord[]> {
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

  if (goal.toLowerCase().includes('checkout') || goal.toLowerCase().includes('payment')) {
    checks.push({
      checkId: 'checkout-or-cart-path',
      passed: /\/app\/(checkout|cart)/.test(path),
      detail: path.includes('/checkout') ? 'On checkout page' : `Path ${path} (expected checkout or cart)`,
    });
  }

  if (goal.toLowerCase().includes('cart') || goal.toLowerCase().includes('basket')) {
    checks.push({
      checkId: 'cart-signal',
      passed: /cart|item|total|basket/i.test(bodyText) || /\/app\/cart/.test(path),
      detail: /cart|item|total|basket/i.test(bodyText) ? 'Cart-related text found' : 'No cart signal in page text',
    });
  }

  if (goal.toLowerCase().includes('product') || goal.toLowerCase().includes('catalog') || goal.toLowerCase().includes('browse')) {
    checks.push({
      checkId: 'products-signal',
      passed: /product|catalog|storefront/i.test(bodyText) || /\/app\/products/.test(path),
      detail: /product|catalog|storefront/i.test(bodyText) ? 'Products signal found' : 'No products signal',
    });
  }

  const useLlm =
    options.llmVerification !== false &&
    (options.llmVerification === true || options.plannerMode === 'llm' || process.env.AUTONOMOUS_LLM_VERIFY === '1');

  if (useLlm && options.trace) {
    const pageState =
      options.pageState ??
      ({
        url: page.url(),
        title: await page.title().catch(() => ''),
      } satisfies AutonomousPageState);

    const llmChecks = await runLlmVerificationAgent(
      { goal, pageState, trace: options.trace },
      options.plannerMode
    );
    checks.push(...llmChecks);
  }

  return checks;
}

export function summarizeVerifications(records: AutonomousVerificationRecord[]): string {
  const failed = records.filter((r) => !r.passed);
  if (failed.length === 0) return `All ${records.length} verification checks passed`;
  return `${failed.length}/${records.length} checks failed: ${failed.map((f) => f.checkId).join(', ')}`;
}
