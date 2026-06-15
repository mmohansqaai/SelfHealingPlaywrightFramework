import type { Page } from '@playwright/test';
import { scanDomElements } from '../core/discovery/dom-scan-discovery';
import type { AutonomousPageState } from 'autonomous-agent-contracts';

export async function getAutonomousPageState(page: Page): Promise<AutonomousPageState> {
  let title = '';
  try {
    title = await page.title();
  } catch {
    title = '';
  }

  let domElementCount: number | undefined;
  try {
    const snap = await scanDomElements(page, 'click');
    domElementCount = snap.length;
  } catch {
    domElementCount = undefined;
  }

  return {
    url: page.url(),
    title,
    domElementCount,
  };
}
