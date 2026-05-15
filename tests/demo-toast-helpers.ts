import type { Page } from '@playwright/test';
import type { LocatorStrategy } from '../core/healing-types';

export const DEMO_TOAST_MS = Number(process.env.DEMO_TOAST_MS || 22_000);
export const DEMO_PAUSE_MS = Number(process.env.DEMO_PAUSE_MS || 8_000);

export function miss(name: string, selector: string): LocatorStrategy {
  return { name, resolve: (p) => p.locator(selector) };
}

export function formatHealedLocator(query: unknown, fallbackStrategy?: string): string {
  if (query) return JSON.stringify(query);
  return fallbackStrategy ?? 'n/a';
}

export async function demoToast(
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
      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = '700';
      titleEl.style.fontSize = '13px';
      titleEl.style.lineHeight = '1.25';
      titleEl.style.marginBottom = '6px';
      titleEl.textContent = title;
      const bodyEl = document.createElement('div');
      bodyEl.style.opacity = '0.98';
      bodyEl.style.whiteSpace = 'pre-wrap';
      bodyEl.style.lineHeight = '1.35';
      bodyEl.textContent = message;
      const footerEl = document.createElement('div');
      footerEl.style.opacity = '0.85';
      footerEl.style.fontSize = '12px';
      footerEl.style.marginTop = '8px';
      footerEl.textContent = `(Showing for ${Math.round(ms / 1000)}s)`;
      el.append(titleEl, bodyEl, footerEl);
      root.appendChild(el);
      window.setTimeout(() => el.remove(), ms);
    },
    { title, message, color, ms }
  );
}
