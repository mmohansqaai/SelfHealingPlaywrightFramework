import type { Page } from '@playwright/test';
import type { AutonomousInteractiveElement, AutonomousPageState } from 'autonomous-agent-contracts';
import { scanDomElements, type DomElementSnapshot } from 'ai-healing-sdk';

const MAX_PLANNER_ELEMENTS = 35;

function elementLabel(el: DomElementSnapshot): string {
  return (el.ariaLabel || el.text || el.placeholder || el.name || el.id || '').trim().slice(0, 80);
}

function inferRole(el: DomElementSnapshot): string | undefined {
  if (el.role) return el.role;
  if (el.tag === 'button' || el.inputType === 'submit' || el.inputType === 'button') return 'button';
  if (el.tag === 'a' && el.href) return 'link';
  if (el.tag === 'input' || el.tag === 'textarea' || el.tag === 'select') return 'textbox';
  if (el.tag.startsWith('h') && el.tag.length === 2) return 'heading';
  return undefined;
}

function toInteractive(el: DomElementSnapshot): AutonomousInteractiveElement | null {
  const label = elementLabel(el);
  if (!label && el.tag !== 'input') return null;
  return {
    tag: el.tag,
    role: inferRole(el),
    label: label || el.inputType || el.tag,
    inputType: el.inputType,
  };
}

function mergeDomSnapshots(click: DomElementSnapshot[], fill: DomElementSnapshot[]): DomElementSnapshot[] {
  const seen = new Set<string>();
  const out: DomElementSnapshot[] = [];
  for (const el of [...click, ...fill]) {
    const key = `${el.tag}|${elementLabel(el)}|${el.inputType ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(el);
    if (out.length >= MAX_PLANNER_ELEMENTS) break;
  }
  return out;
}

/** Phase 13 — page state with interactive element summary for LLM planner. */
export async function getAutonomousPageStateForPlanner(page: Page): Promise<AutonomousPageState> {
  let title = '';
  try {
    title = await page.title();
  } catch {
    title = '';
  }

  let clickSnap: DomElementSnapshot[] = [];
  let fillSnap: DomElementSnapshot[] = [];
  try {
    [clickSnap, fillSnap] = await Promise.all([
      scanDomElements(page, 'click'),
      scanDomElements(page, 'fill'),
    ]);
  } catch {
    clickSnap = [];
    fillSnap = [];
  }

  const merged = mergeDomSnapshots(clickSnap, fillSnap);
  const interactiveElements = merged
    .map(toInteractive)
    .filter((el): el is AutonomousInteractiveElement => el !== null);

  return {
    url: page.url(),
    title,
    domElementCount: merged.length,
    interactiveElements,
  };
}

/** Lightweight page state (no full DOM scan). */
export async function getAutonomousPageState(page: Page): Promise<AutonomousPageState> {
  let title = '';
  try {
    title = await page.title();
  } catch {
    title = '';
  }
  return { url: page.url(), title };
}
