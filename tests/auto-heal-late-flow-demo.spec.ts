import type { Page } from '@playwright/test';
import { attachLiveAutoHealProof } from '../core/healing-reporter';
import type { LocatorStrategy } from '../core/healing-types';
import { clickHealing, expectVisibleHealing } from '../core/self-healing';
import { expect, test } from './fixtures';
import { loginAsCustomer } from './traceability/_helpers';

const demoAutoHeal = {
  enabled: true as const,
  discoverOnly: true as const,
  minConfidence: 70,
};

// Executive demo pacing (override via env vars if you want it even slower/faster).
const DEMO_TOAST_MS = Number(process.env.DEMO_TOAST_MS || 22_000);
const DEMO_PAUSE_MS = Number(process.env.DEMO_PAUSE_MS || 8_000);

function miss(name: string, selector: string): LocatorStrategy {
  return { name, resolve: (p) => p.locator(selector) };
}

async function toast(
  page: Page,
  title: string,
  message: string,
  kind: 'info' | 'warn' | 'ok' = 'info',
  ms: number = DEMO_TOAST_MS
): Promise<void> {
  const color =
    kind === 'ok' ? 'rgba(16,185,129,0.95)' : kind === 'warn' ? 'rgba(245,158,11,0.95)' : 'rgba(59,130,246,0.95)';
  await page.evaluate(
    ({ title, message, color, ms }) => {
      const id = 'sh-toast-root';
      let root = document.getElementById(id);
      if (!root) {
        root = document.createElement('div');
        root.id = id;
        root.style.position = 'fixed';
        root.style.top = '16px';
        root.style.right = '16px';
        root.style.zIndex = '2147483647';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '10px';
        // Ensure demo overlays never block user-actions (click-through).
        root.style.pointerEvents = 'none';
        document.documentElement.appendChild(root);
      }
      const el = document.createElement('div');
      el.style.maxWidth = '520px';
      el.style.padding = '12px 14px';
      el.style.borderRadius = '10px';
      el.style.background = color;
      el.style.color = 'white';
      el.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
      el.style.fontSize = '13px';
      el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';
      el.style.border = '1px solid rgba(255,255,255,0.18)';
      el.style.backdropFilter = 'blur(6px)';
      el.style.pointerEvents = 'none';
      el.innerHTML = `
        <div style="font-weight:700;font-size:13px;line-height:1.25;margin-bottom:6px;">${title}</div>
        <div style="opacity:0.98;white-space:pre-wrap;line-height:1.35;">${message}</div>
        <div style="opacity:0.85;font-size:12px;margin-top:8px;">(Showing for ${Math.round(ms / 1000)}s)</div>
      `;
      root.appendChild(el);
      window.setTimeout(() => el.remove(), ms);
    },
    { title, message, color, ms }
  );
}

test.describe('Auto-heal late-flow demo (Nova Retail)', () => {
  test.beforeAll(() => {
    process.env.AUTO_HEAL_DISCOVER = '1';
    delete process.env.AUTO_HEAL_PERSIST;
  });

  test('add-to-cart heals later in flow + on-screen toasts @self-healing-showcase', async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);
    await loginAsCustomer(page, testInfo);

    await toast(
      page,
      'Self-Healing Demo (Executive View)',
      'Purpose:\n- Demonstrate resilience when the application UI changes\n\nWhat you will see:\n- A step fails due to a UI change\n- The framework automatically recovers\n- The business flow continues without manual intervention',
      'info'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    await page.goto('/app/products');
    await expectVisibleHealing(page, [], { actionType: 'visible', autoHeal: demoAutoHeal });

    // Force a miss on purpose; auto-heal discovers the real "Add to cart" from live DOM.
    const addToCart = await clickHealing(page, [miss('add-to-cart-miss-demo', 'button[data-demo-miss-add=\"1\"]')], {
      actionType: 'click',
      autoHeal: demoAutoHeal,
      timeoutPerStrategyMs: 6_000,
    });
    const failedAttempts = addToCart.attempts.filter((a) => !a.ok).length;
    await toast(
      page,
      'Broken test step detected',
      `Observed issue:\n- Add-to-cart locator did not match the current DOM\n- Failed locator attempts: ${failedAttempts}\n\nAction:\n- Triggering self-healing candidate discovery before marking the step failed`,
      'warn'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    const selected = addToCart.autoHeal?.selectedCandidate;
    const picked = selected ? `${selected.strategyName} (score=${selected.score})` : addToCart.usedStrategy;
    await toast(
      page,
      'Healing details',
      `Recovery result:\n- Auto-heal selected: ${picked}\n- Step resumed without manual script changes\n\nEvidence:\n- Attempt history and selected candidate are attached in the report`,
      'ok'
    );
    await page.waitForTimeout(DEMO_PAUSE_MS);

    await page.goto('/app/cart');
    const cartReady = await expectVisibleHealing(page, [], { actionType: 'visible', autoHeal: demoAutoHeal });
    await expect(page).toHaveURL(/\/app\/cart/, { timeout: 25_000 });

    await attachLiveAutoHealProof(testInfo, [
      { title: 'add-to-cart', result: addToCart },
      { title: 'cart-ready', result: cartReady },
    ]);
  });
});

