import type { Page } from '@playwright/test';
import type { AutonomousPageState } from 'autonomous-agent-contracts';

const MAX_SCREENSHOT_BYTES = Number(process.env.AUTONOMOUS_VISION_MAX_KB ?? 200) * 1024;

/** Phase 16 — optional screenshot capture for vision-assisted planning (metadata only in v1 spike). */
export async function enrichPageStateWithVision(
  page: Page,
  state: AutonomousPageState
): Promise<AutonomousPageState> {
  if (process.env.AUTONOMOUS_VISION !== '1') return state;

  try {
    const buffer = await page.screenshot({ type: 'jpeg', quality: 45, fullPage: false, timeout: 8_000 });
    if (buffer.length > MAX_SCREENSHOT_BYTES) {
      return {
        ...state,
        visionNote: `Screenshot captured (${(buffer.length / 1024).toFixed(0)}KB) — exceeds cap; DOM summary used for planning.`,
        screenshotBytes: buffer.length,
      };
    }
    return {
      ...state,
      visionNote: `Screenshot captured (${(buffer.length / 1024).toFixed(0)}KB). Vision LLM routing is experimental — planner uses DOM summary + vision metadata.`,
      screenshotBytes: buffer.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...state,
      visionNote: `Screenshot capture failed: ${message}`,
    };
  }
}

export function isAutonomousVisionEnabled(): boolean {
  return process.env.AUTONOMOUS_VISION === '1';
}
