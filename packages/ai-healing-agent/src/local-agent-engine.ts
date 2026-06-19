import type {
  AgentToolCall,
  AgentTrace,
  GeneratedLocatorCandidate,
  HealingAttempt,
  HealingRequest,
  HealingResponse,
} from 'ai-healing-core';
import { formatLocatorQuery, queryKey } from 'ai-healing-core';
import { failureHints } from './intent-hints';
import { listHeuristicCandidatesOffline } from './offline-discovery';

export type SearchDomInput = { role?: string; tag?: string; textContains?: string };

export function searchDom(
  snapshot: HealingRequest['domSnapshot'],
  input: SearchDomInput
): NonNullable<HealingRequest['domSnapshot']> {
  if (!snapshot?.length) return [];
  return snapshot.filter((el) => {
    if (input.role && el.role !== input.role) return false;
    if (input.tag && el.tag !== input.tag) return false;
    if (input.textContains) {
      const needle = input.textContains.toLowerCase();
      const hay = `${el.text ?? ''} ${el.ariaLabel ?? ''} ${el.placeholder ?? ''}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export function inferDomSearchFromHints(hints: string | undefined): SearchDomInput {
  const h = (hints ?? '').toLowerCase();
  const input: SearchDomInput = {};
  if (/\b(button|click|submit|sign in|add to cart)\b/.test(h)) input.role = 'button';
  if (/\b(email|password|fill|input|textbox)\b/.test(h)) input.role = 'textbox';
  if (/\bemail\b/.test(h)) input.textContains = 'email';
  if (/\bpassword\b/.test(h)) input.textContains = 'password';
  if (/\bsign in\b/.test(h)) input.textContains = 'sign';
  if (/\badd to cart\b/.test(h)) input.textContains = 'cart';
  return input;
}

function excludeFailed(candidates: GeneratedLocatorCandidate[], failed: Set<string>): GeneratedLocatorCandidate[] {
  return candidates.filter((c) => !failed.has(formatLocatorQuery(c.query)));
}

export function runLocalAgentEngine(
  request: HealingRequest,
  attempts: HealingAttempt[] = []
): {
  candidates: GeneratedLocatorCandidate[];
  reasoning: string;
  toolCalls: AgentToolCall[];
  trace: AgentTrace;
} {
  const started = Date.now();
  const toolCalls: AgentToolCall[] = [];

  const heuristicCandidates = listHeuristicCandidatesOffline({
    actionType: request.action,
    attempts,
    failureHints: request.failureHints ?? failureHints(attempts),
    domSnapshot: request.domSnapshot,
  });
  toolCalls.push({ name: 'list_heuristic_candidates', outputSummary: `${heuristicCandidates.length} offline candidates` });

  const domSearch = inferDomSearchFromHints(request.failureHints);
  const domMatches = searchDom(request.domSnapshot, domSearch);
  toolCalls.push({ name: 'search_dom', input: domSearch as Record<string, unknown>, outputSummary: `${domMatches.length} DOM matches` });

  const failedKeys = new Set(
    (request.agentContext?.priorValidationResults ?? []).filter((r) => !r.ok).map((r) => r.healedLocator)
  );
  let candidates = excludeFailed(heuristicCandidates, failedKeys);

  if (domMatches.length) {
    const matchTexts = new Set(domMatches.map((d) => (d.text ?? '').toLowerCase()).filter(Boolean));
    candidates = candidates.map((c) => {
      let bonus = 0;
      if (c.query.type === 'role' && matchTexts.has(c.query.name.toLowerCase())) bonus += 8;
      if (!bonus) return c;
      return { ...c, score: c.score + bonus, reason: `${c.reason} [agent:dom-align=+${bonus}]` };
    });
  }

  const merged = new Map<string, GeneratedLocatorCandidate>();
  for (const c of candidates) {
    const key = queryKey(c.query);
    const existing = merged.get(key);
    if (!existing || c.score > existing.score) merged.set(key, c);
  }
  candidates = Array.from(merged.values()).sort((a, b) => b.score - a.score);

  const iteration = request.agentContext?.iteration ?? 0;
  const reasoning =
    candidates.length > 0
      ? `Local agent iteration ${iteration + 1}: ${candidates.length} candidate(s) from offline tools.`
      : `Local agent iteration ${iteration + 1}: no viable candidates.`;

  return {
    candidates,
    reasoning,
    toolCalls,
    trace: {
      agentId: 'local-healing-agent',
      iteration,
      model: 'heuristic-agent-v1',
      toolCalls,
      reasoning,
      latencyMs: Date.now() - started,
    },
  };
}

export async function postHealRequest(
  baseUrl: string,
  request: HealingRequest,
  timeoutMs: number
): Promise<HealingResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/heal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const payload = (await response.json()) as HealingResponse;
    if (!response.ok) {
      return { status: 'error', error: payload.error ?? `healing-service responded with ${response.status}` };
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}
