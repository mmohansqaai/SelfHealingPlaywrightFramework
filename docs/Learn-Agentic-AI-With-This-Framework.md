# Learn Agentic AI Using This Framework (Fresher → Owner)

**Goal:** Stop being a passenger of vibe-coding. Understand each concept by **running, reading, then changing** code in *this* repo.

**You already have the best classroom:** a working agentic healing + autonomous platform.  
**This plan uses that codebase as the textbook.**

**Time:** ~4–6 weeks part-time (1–2 hours/day), or ~2 weeks full focus.  
**Rule:** Every week ends with a **checkpoint** you can demo without asking Cursor “what does this do?”

---

## How to study (non-negotiable method)

For every topic, use **RRC**:

1. **Run** — execute the smallest demo related to the idea  
2. **Read** — open 1–3 files only (listed below)  
3. **Change** — make a tiny edit and prove you understand (listed exercises)

If you only read docs, you will stay confused.  
If you only ask AI to explain, you stay dependent.  
**Control = you can change behavior and predict the result.**

Keep a notebook (or Notion) with 4 columns:

| Date | Concept | File I read | What I changed | Result |
|------|---------|-------------|----------------|--------|

---

## Mental model first (memorize this)

```
Orchestrator  = conductor (when / which agent)
Agent         = doer (observe → tools → act → reflect)
Tools         = powers the agent can call
Environment   = live browser / page (ground truth)
Optional LLM  = smarter proposer (not required for “agentic”)
```

In this product:

| Layer | Your repo |
|-------|-----------|
| Agent loop (local) | `packages/ai-healing-agent/` |
| Agent loop (Playwright-rich) | `packages/ai-healing-sdk/src/agent/` |
| Orchestrator (cloud) | `services/healing-service/src/orchestration/` |
| Router | `services/healing-service/src/routing/agent-router.ts` |
| Agents | `agents/locator-agent`, `agents/llm-locator-agent`, `agents/autonomous-test-agent` |
| Demo | `examples/playwright-plug-and-play`, `examples/nova-retail-qa` |

---

## Phase 0 — Foundations (2–3 days)

**Outcome:** You can explain agentic without looking at slides.

### Concepts to learn (external, light)

1. What is an **agent** (goal + tools + loop)?  
2. What is **not** an agent (one-shot script / fixed if-else list)?  
3. Observe → Reason → Act → Reflect  
4. Why **validation on the environment** matters (browser = truth)

**Optional readings (30–45 min total):**  
- Any short “Agentic AI intro” article (Anthropic / OpenAI cookbook style)  
- Your own notes from chat: “agentic ≠ always ChatGPT”

### Hands-on in this repo

```bash
npm install && npm run install:browsers
export AUTO_HEAL_DISCOVER=1
npm run test:plug-and-play
```

**Checkpoint 0 (must pass):**  
Out loud, answer:

> “When the wrong selector fails, what happens next in 5 steps?”

If you cannot, rewatch the headed run and open:

- `examples/playwright-plug-and-play/tests/plug-and-play.spec.ts`

---

## Phase 1 — Consumer API (you as user, not author) — 3–4 days

**Outcome:** You know how a QA engineer *uses* healing.

### Run

```bash
AUTO_HEAL_DISCOVER=1 npm run test:plug-and-play:ci
```

### Read (only these)

1. `examples/playwright-plug-and-play/README.md`  
2. `packages/ai-healing-sdk/src/wrappers/enable-healing.ts`  
3. `packages/ai-healing-sdk/src/wrappers/healable.ts`

### Change exercises

| # | Exercise | Pass criteria |
|---|----------|---------------|
| 1.1 | Intentionally break a *working* selector in the demo | Test fails without healing |
| 1.2 | Turn healing on | Same test recovers |
| 1.3 | Set `HEALING_AGENT_MAX_ITERATIONS=1` | Recovery harder / may fail — explain why |
| 1.4 | Open Playwright HTML report | Point to healing attachment fields |

**Checkpoint 1:**  
You can configure healing with only env vars and explain Tier 1 vs Tier 3 without notes.

Env cheatsheet:

| Variable | Meaning |
|----------|---------|
| `AUTO_HEAL_DISCOVER=1` | Healing allowed |
| `HEALING_AGENT_MODE=agentic` | Use agent loop |
| `HEALING_SERVICE_URL=...` | Use cloud brain |
| `HEALING_AGENT_MAX_ITERATIONS=3` | Reflect cap |

---

## Phase 2 — The Agent Loop (heart of Agentic) — 5–7 days

**Outcome:** You can walk someone through **observe → tools → act → reflect** in *your code*.

### Run first

```bash
AUTO_HEAL_DISCOVER=1 npm run test:plug-and-play
```

Keep the mental loop on a sticky note while reading.

### Read order (do not skip)

**Day A — Request (OBSERVE)**  
1. `packages/ai-healing-sdk/src/agent/build-healing-request.ts`  
2. `packages/ai-healing-core/src/contracts.ts` (or `types.ts`)

Ask yourself:

- What fields go into a healing request?  
- What is the DOM snapshot for?

**Day B — Engine / tools (REASON)**  
1. `packages/ai-healing-agent/src/local-agent-engine.ts`  
2. `packages/ai-healing-agent/src/offline-discovery.ts`  
3. `packages/ai-healing-sdk/src/agent/tools.ts` (if present)

Ask yourself:

- What tools exist?  
- Which run without an LLM?

**Day C — Loop (ACT + REFLECT)**  
1. `packages/ai-healing-agent/src/driver-healing-loop.ts`  
2. `packages/ai-healing-sdk/src/agent/agent-loop.ts`

Ask yourself:

- Where is `maxIterations` enforced?  
- Where are failed candidates remembered?

### Change exercises

| # | Exercise | Pass criteria |
|---|----------|---------------|
| 2.1 | Log (console) each loop iteration + candidate tried | You see N iterations in terminal |
| 2.2 | Temporarily make scoring always reject candidates | Healing fails; you explain “ACT gate” |
| 2.3 | Restore scoring; change max candidates to 1 | Behavior changes predictably |
| 2.4 | Draw the loop on paper from memory | Matches code without peeking |

**Checkpoint 2 (critical):**  
Explain to a friend *without opening the repo*:

1. Static locator fails  
2. Request built  
3. Agent proposes candidates  
4. Browser validates  
5. Reflect + retry or fail  

If you cannot → stay in Phase 2. Do not jump to LLM yet.

---

## Phase 3 — Agents vs Orchestrators — 4–5 days

**Outcome:** You stop mixing “agent” and “orchestrator”.

### Concept

- **Agent** = specializes in proposing / recovering  
- **Orchestrator** = decides routing, merging, caching, tracing  

### Run (local service)

```bash
# Terminal 1
export HEALING_LLM_PROVIDER=mock
npm run healing-service

# Terminal 2
curl -s http://localhost:3921/health
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
npm run test:plug-and-play:ci
```

### Read order

1. `services/healing-service/src/api/heal-route.ts` — HTTP entry  
2. `services/healing-service/src/orchestration/healing-orchestrator.ts` — conductor  
3. `services/healing-service/src/routing/agent-router.ts` — which agent?  
4. `agents/locator-agent/src/locator-agent.ts` — heuristic agent  
5. `agents/llm-locator-agent/src/llm-locator-agent.ts` — LLM agent  

### Change exercises

| # | Exercise | Pass criteria |
|---|----------|---------------|
| 3.1 | Add a log line in orchestrator: “routing to X” | You see which agent ran |
| 3.2 | Force router to prefer locator-agent only (temporarily) | Still heals (heuristic path) |
| 3.3 | With `mock` provider, find where mock response is built | You know LLM is optional |
| 3.4 | Compare local-only vs service run | Same test code, different brain path |

**Checkpoint 3:**  
One sentence each:

> Orchestrator in this repo is ______ because ______.  
> An agent in this repo is ______ because ______.

---

## Phase 4 — Optional GenAI (LLM) — 3–4 days

**Outcome:** You know when AI is “agentic architecture” vs “LLM-powered”.

### Concept

Agentic can be true **without** GenAI.  
GenAI is an **upgrade to the Reason step**.

### Setup (if you have a key)

```bash
export HEALING_LLM_PROVIDER=openai   # or anthropic
export HEALING_LLM_API_KEY=...
npm run healing-service
```

If no key — stay on `mock` and still complete the read/change work.

### Read

1. `packages/llm-provider/src/resolve-client.ts`  
2. `packages/llm-provider/src/openai-client.ts` (or anthropic)  
3. `agents/llm-locator-agent/src/llm-locator-agent.ts`  
4. How tool results are fed into the prompt  

### Change exercises

| # | Exercise | Pass criteria |
|---|----------|---------------|
| 4.1 | Run once with `mock`, once with real LLM (if key) | Compare candidates / traces |
| 4.2 | Find where API keys must live (service, not tests) | Security understanding |
| 4.3 | Break the prompt slightly (bad instruction) | See worse / empty proposals |
| 4.4 | Write 5 lines: “What the LLM is allowed to output” | Structured locators only |

**Checkpoint 4:**  
Honest pitch you can say:

> “This framework is agentic (loop + tools + validate). GenAI is optional escalation via healing-service.”

---

## Phase 5 — Multi-agent / Autonomous layer — 5–7 days

**Outcome:** You understand a second agent family (planner ≠ healer).

Healing agent recovers **one element**.  
Autonomous agent drives a **whole journey**.

### Run

```bash
npm run install:nova-retail-qa
npm run nova -- test:autonomous-login
npm run nova -- test:autonomous-ci-smoke
```

### Read

1. `packages/autonomous-qa-sdk/src/autonomous/run-autonomous-test.ts`  
2. `agents/autonomous-test-agent/src/plan-router.ts`  
3. `agents/autonomous-test-agent/src/llm-planner.ts` (or `mock-planner.ts`)  
4. `agents/autonomous-test-agent/src/replan.ts`  

### Change exercises

| # | Exercise | Pass criteria |
|---|----------|---------------|
| 5.1 | Trace one login: which steps planned? | List steps from logs/report |
| 5.2 | Intentionally weaken a goal | Planner struggle / replan |
| 5.3 | Note where healing is reused | Healing is dependency, not duplicate |
| 5.4 | Draw: Goal → Plan → Execute → Verify → Replan | Matches code |

**Checkpoint 5:**  
Explain:

> Healing = flat tyre fix. Autonomous = navigation from destination. Same car, different agents.

---

## Phase 6 — Take ownership (stop vibe-coding) — ongoing

**Outcome:** You can maintain and extend without “please rebuild everything”.

### Ownership checklist (tick when true)

- [ ] I can draw the agent loop from memory  
- [ ] I can point to orchestrator vs agent files  
- [ ] I can demo local heal + service heal  
- [ ] I can explain AI vs agentic honestly to CTO  
- [ ] I can change max iterations and predict impact  
- [ ] I can add a log / metric without breaking builds  
- [ ] I can run UAT Day 1 from `docs/UAT-Test-Plan-and-Usage.md` alone  
- [ ] I can review a Cursor PR and reject bad agent changes  

### Capstone projects (pick 1)

| Capstone | Teaches |
|----------|---------|
| **A.** Add a new agent tool `search_by_placeholder` | Tooling extension |
| **B.** Add telemetry: count heals per test file | Observability |
| **C.** Write a 10-slide “Agentic 101” for juniors using this repo | Teaching = mastery |
| **D.** Cypress or Selenium mini-demo in your words | Multi-framework control |

### Daily habit (after Phase 6)

1 day/week: change **one small thing**, open PR-style notes:

- What I changed  
- Which agent/orchestrator affected  
- How I verified  

---

## Recommended weekly calendar

| Week | Focus | Checkpoint |
|------|-------|------------|
| 1 | Phase 0–1 | Demo plug-and-play + explain failure→heal |
| 2 | Phase 2 | Draw + walkthrough agent loop from code |
| 3 | Phase 3 | Local vs service; orchestrator logs |
| 4 | Phase 4–5 | LLM optional + autonomous login |
| 5+ | Phase 6 | Capstone + UAT Day 1 alone |

---

## Learning anti-patterns (avoid)

| Anti-pattern | Better |
|--------------|--------|
| Ask Cursor to “explain entire architecture” weekly | Ask about **one file** |
| Jump to LLM first | Master local loop first |
| Only regenerate decks | Run demos + change code |
| Rename everything for “clean code” | Small behavior experiments |
| Skip failing tests | Failures are your tutors |

---

## Quick map: concepts → files

| Agentic concept | Learn from |
|-----------------|------------|
| Observe | `build-healing-request.ts`, core contracts |
| Tools | `tools.ts`, `offline-discovery.ts`, `local-agent-engine.ts` |
| Act / validate | `driver-healing-loop.ts` viability scoring |
| Reflect / iterate | `agent-loop.ts`, `maxIterations` |
| Orchestrate | `healing-orchestrator.ts` |
| Route agents | `agent-router.ts` |
| LLM agent | `llm-locator-agent.ts` + `llm-provider` |
| Planner agent | `autonomous-test-agent` |
| Product demo | `examples/playwright-plug-and-play` |
| Full journey demo | `examples/nova-retail-qa` |

---

## Definition of “I own this”

You own the framework when you can say:

> “Agentic here means a bounded loop with tools and live browser validation. Orchestrators route and merge; agents propose. LLMs are optional. I can show it, change iteration limits, and predict the outcome.”

Until then, stay in the phase whose checkpoint you cannot pass.

---

## Companion docs

- Walkthrough: `docs/Agentic-Platform-Capability-Walkthrough-Speaker-Notes.md`  
- UAT: `docs/UAT-Test-Plan-and-Usage.md`  
- CTO brief: `docs/CTO-AI-Director-Agentic-Healing-Brief.md`  
- Regenerated decks: `npm run deck:capability`

---

## Start today (30 minutes)

```bash
export AUTO_HEAL_DISCOVER=1
npm run test:plug-and-play
```

Then open:

1. `examples/playwright-plug-and-play/tests/plug-and-play.spec.ts`  
2. `packages/ai-healing-agent/src/driver-healing-loop.ts`  

Write 10 lines in your notebook:

- What failed first?  
- Who proposed the new locator?  
- Who validated it?  
- What would happen if maxIterations = 0?

That is Day 1 of taking control.
