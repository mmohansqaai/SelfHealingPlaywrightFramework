import type {
  DomElementSnapshot,
  GeneratedLocatorCandidate,
  GeneratedLocatorQuery,
  HealingActionType,
  HealingAttempt,
} from 'ai-healing-core';
import { queryKey } from 'ai-healing-core';
import { hasSignal } from './intent-hints';

type SeedCandidate = { query: GeneratedLocatorQuery; reason: string; baseScore: number };

function buildSeedCandidates(actionType: HealingActionType, failureHints: string): SeedCandidate[] {
  const hints = failureHints.toLowerCase();
  const seeds: SeedCandidate[] = [];

  if (hasSignal(hints, 'email', 'mail')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="email"], input[name*="email" i], input[id*="email" i]' },
      reason: 'email-like input from failed strategy hints',
      baseScore: 90,
    });
  }
  if (hasSignal(hints, 'password', 'pass')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="password"], input[name*="password" i], input[id*="password" i]' },
      reason: 'password-like input from failed strategy hints',
      baseScore: 90,
    });
  }
  if (hasSignal(hints, 'sign in', 'signin', 'login', 'submit')) {
    seeds.push({ query: { type: 'role', role: 'button', name: 'Sign in' }, reason: 'auth button fallback', baseScore: 88 });
    seeds.push({ query: { type: 'css', value: 'button[type="submit"], input[type="submit"]' }, reason: 'submit fallback', baseScore: 80 });
  }
  if (actionType === 'click' && hasSignal(hints, 'add to cart', 'add-to-cart', 'add item')) {
    seeds.push({ query: { type: 'role', role: 'button', name: 'Add to cart' }, reason: 'add-to-cart fallback', baseScore: 92 });
  }
  if (actionType === 'visible') {
    seeds.push({ query: { type: 'role', role: 'heading', name: 'Sign in to your workspace' }, reason: 'heading fallback', baseScore: 84 });
  }
  seeds.push({ query: { type: 'css', value: '[data-testid], [aria-label], button, input, a' }, reason: 'broad structural fallback', baseScore: 10 });
  return seeds;
}

function elementLabel(el: DomElementSnapshot): string {
  return (el.ariaLabel || el.text || el.placeholder || el.name || '').trim().toLowerCase();
}

function snapshotMatchesQuery(query: GeneratedLocatorQuery, snapshots: DomElementSnapshot[]): number {
  if (!snapshots.length) return 1;
  let matches = 0;
  for (const el of snapshots) {
    if (query.type === 'role') {
      const label = elementLabel(el);
      const role = el.role || (el.tag === 'button' ? 'button' : el.tag.startsWith('h') ? 'heading' : el.tag === 'a' ? 'link' : undefined);
      if (role === query.role && label.includes(query.name.toLowerCase())) matches += 1;
      continue;
    }
    const css = query.value.toLowerCase();
    if (css.includes('email') && el.inputType === 'email') matches += 1;
    else if (css.includes('password') && el.inputType === 'password') matches += 1;
    else if (css.includes('submit') && (el.inputType === 'submit' || el.tag === 'button')) matches += 1;
    else if (css.includes('data-testid') && el.testId) matches += 1;
    else if (css.includes('button') && (el.tag === 'button' || el.role === 'button')) matches += 1;
    else if (css.includes('input') && el.tag === 'input') matches += 1;
  }
  return matches;
}

export function discoverSeedCandidatesOffline(args: {
  actionType: HealingActionType;
  failureHints: string;
  domSnapshot?: DomElementSnapshot[];
}): GeneratedLocatorCandidate[] {
  const seeds = buildSeedCandidates(args.actionType, args.failureHints);
  const out: GeneratedLocatorCandidate[] = [];
  for (const seed of seeds) {
    const matchCount = snapshotMatchesQuery(seed.query, args.domSnapshot ?? []);
    const uniquenessBoost = matchCount === 1 ? 10 : matchCount > 1 ? Math.max(0, 6 - matchCount) : 0;
    if (matchCount < 1 && seed.baseScore > 20) continue;
    out.push({
      strategyName: `seed-${seed.query.type}-${out.length + 1}`,
      query: seed.query,
      score: seed.baseScore + uniquenessBoost,
      reason: `${seed.reason}; snapshotMatches=${matchCount}`,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}

function cssEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function inferRole(el: DomElementSnapshot): string | undefined {
  if (el.role) return el.role;
  if (el.tag === 'button' || el.inputType === 'submit' || el.inputType === 'button') return 'button';
  if (el.tag === 'a' && el.href) return 'link';
  if (el.tag === 'textarea' || el.tag === 'select' || el.tag === 'input') return 'textbox';
  if (el.tag.startsWith('h')) return 'heading';
  return undefined;
}

function matchesActionType(el: DomElementSnapshot, actionType: HealingActionType): boolean {
  const role = inferRole(el);
  if (el.disabled) return false;
  if (actionType === 'click') {
    return el.tag === 'button' || el.tag === 'a' || role === 'button' || role === 'link' || el.inputType === 'submit' || el.inputType === 'button';
  }
  if (actionType === 'fill') return el.tag === 'input' || el.tag === 'textarea' || el.tag === 'select';
  return role === 'heading' || el.tag.startsWith('h');
}

function intentBoost(el: DomElementSnapshot, hints: string, actionType: HealingActionType): number {
  const label = elementLabel(el);
  let boost = 0;
  if (hasSignal(hints, 'email', 'mail') && (el.inputType === 'email' || hasSignal(label, 'email'))) boost += 40;
  if (hasSignal(hints, 'password', 'pass') && el.inputType === 'password') boost += 40;
  if (actionType === 'click' && hasSignal(hints, 'add to cart', 'add-to-cart') && hasSignal(label, 'add to cart', 'add item')) boost += 45;
  if (actionType === 'click' && hasSignal(hints, 'sign in', 'login', 'submit') && hasSignal(label, 'sign in', 'log in')) boost += 35;
  if (el.testId) boost += 8;
  if (el.id && !el.id.includes(' ')) boost += 5;
  return boost;
}

function buildQueriesForElement(el: DomElementSnapshot): GeneratedLocatorQuery[] {
  const queries: GeneratedLocatorQuery[] = [];
  const role = inferRole(el);
  const label = (el.ariaLabel || el.text || el.placeholder || el.name || '').trim().slice(0, 120);
  if (el.testId) queries.push({ type: 'css', value: `[data-testid="${cssEscape(el.testId)}"]` });
  if (el.id && !/\s/.test(el.id)) queries.push({ type: 'css', value: `#${cssEscape(el.id)}` });
  if (role && label.length >= 2 && label.length <= 80) queries.push({ type: 'role', role, name: label });
  if (el.name) queries.push({ type: 'css', value: `${el.tag}[name="${cssEscape(el.name)}"]` });
  if (el.placeholder) queries.push({ type: 'css', value: `${el.tag}[placeholder="${cssEscape(el.placeholder)}"]` });
  return queries;
}

export function synthesizeCandidatesFromDomSnapshots(
  snapshots: DomElementSnapshot[],
  actionType: HealingActionType,
  attempts: HealingAttempt[]
): GeneratedLocatorCandidate[] {
  const hints = attempts.map((a) => [a.strategy, a.error ?? ''].join(' ')).join(' ').toLowerCase();
  const seen = new Set<string>();
  const out: GeneratedLocatorCandidate[] = [];
  for (const el of snapshots) {
    if (!matchesActionType(el, actionType)) continue;
    for (const query of buildQueriesForElement(el)) {
      const key = queryKey(query);
      if (seen.has(key)) continue;
      seen.add(key);
      const intent = intentBoost(el, hints, actionType);
      out.push({
        strategyName: `domscan-${query.type}-${out.length + 1}`,
        query,
        score: 55 + intent,
        reason: `DOM scan: ${el.tag} label="${labelOf(el)}"; intent=${intent}`,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 12);
}

function labelOf(el: DomElementSnapshot): string {
  return (el.ariaLabel || el.text || el.placeholder || el.name || '').trim().slice(0, 120);
}

export function listHeuristicCandidatesOffline(args: {
  actionType: HealingActionType;
  attempts: HealingAttempt[];
  failureHints?: string;
  domSnapshot?: DomElementSnapshot[];
}): GeneratedLocatorCandidate[] {
  const hints = args.failureHints ?? args.attempts.map((a) => `${a.strategy} ${a.error ?? ''}`).join(' ');
  const seed = discoverSeedCandidatesOffline({ actionType: args.actionType, failureHints: hints, domSnapshot: args.domSnapshot });
  const dom = args.domSnapshot?.length
    ? synthesizeCandidatesFromDomSnapshots(args.domSnapshot, args.actionType, args.attempts)
    : [];
  const merged = new Map<string, GeneratedLocatorCandidate>();
  for (const c of [...seed, ...dom]) {
    const key = queryKey(c.query);
    const existing = merged.get(key);
    if (!existing || c.score > existing.score) merged.set(key, c);
  }
  return Array.from(merged.values()).sort((a, b) => b.score - a.score).slice(0, 16);
}
