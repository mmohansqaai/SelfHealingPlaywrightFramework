# Agentic Platform — Capability Walkthrough Speaker Notes

**Deck:** `docs/Agentic-Platform-Capability-Walkthrough.pptx`  
**Regenerate:** `npm run deck:capability`  
**Audience:** stakeholders, QA leads, CTO/AI Director walkthrough  
**Suggested time:** 25–40 minutes (Section 3 Agentic = 10–15 min)

---

## How to use this deck

1. **Sections 1–2** — set context fast (5 min).
2. **Section 3 (Agentic)** — go deep; this is the differentiator.
3. **Section 4** — switch to terminal and run demos live.
4. **Sections 5–7** — only if audience wants architecture / autonomous / adoption.

---

## Section 1 — Platform at a glance

**Say:**
> UI tests break when selectors change. This platform recovers in-run using an agent that observes the page, proposes locators, validates them live, and retries — across Playwright, Cypress, and Selenium.

**Analogy:**
- Healing = fixing a flat tyre mid-journey
- Autonomous = letting the car drive from a destination goal

---

## Section 2 — Capability map

Hit these seven bullets; if short on time, skip maintenance/Jira:

1. Locator healing  
2. Agentic loop  
3. Multi-framework  
4. Local + cloud modes  
5. Autonomous QA  
6. Observability  
7. Governance  

---

## Section 3 — AGENTIC deep dive (spend time here)

### Opening line
> Agentic here does **not** mean “ChatGPT on every click.” It means a **bounded loop**: observe → use tools → act on the browser → reflect on failures.

### Must-cover points
1. Static locators still run first (fast path).
2. Agent only starts after failure.
3. Live browser validation is mandatory.
4. Iteration cap (default 3).
5. Local agent works without API keys.
6. Cloud/LLM is optional escalation via `healing-service`.
7. Healing does **not** invent business assertions.

### Local vs cloud one-liner
> Same test code. If `HEALING_SERVICE_URL` is set, use cloud brain; otherwise use embedded local agent.

### Credibility
Use the “What Agentic Is NOT” slide early with technical audiences — builds trust.

---

## Section 4 — Live walkthrough script

### Prep
```bash
git clone https://github.com/mmohansqaai/agentic-platform.git
cd agentic-platform
npm install && npm run install:browsers
```

### Demo 1 — Local healing (must do)
```bash
export AUTO_HEAL_DISCOVER=1
export HEALING_AGENT_MODE=agentic
npm run test:plug-and-play
```
**Show:** headed browser retry + HTML report healing attachment.

### Demo 2 — Cloud path (optional)
Terminal 1:
```bash
export HEALING_LLM_PROVIDER=mock
npm run healing-service
```
Terminal 2:
```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
npm run test:plug-and-play:ci
```
**Say:** “Same tests — only environment changed.”

### Demo 3 — Autonomous
```bash
npm run install:nova-retail-qa
npm run nova -- test:autonomous-login
```

---

## Section 5 — Architecture (if asked)

One brain (`ai-healing-core` + `ai-healing-agent`), thin adapters, optional `healing-service`.

Java is cloud-first today; local Java agent is roadmap.

---

## Section 6 — Autonomous

Only if audience cares about goal-driven tests. Emphasize: **reuses healing**, does not replace it.

---

## Section 7 — Close

Leave behind:
- https://github.com/mmohansqaai/agentic-platform
- `docs/UAT-Test-Plan-and-Usage.md`
- `docs/CTO-AI-Director-Agentic-Healing-Brief.md`

**Next ask:** UAT Day 1 smoke → sign-off → npm publish / SaaS.

---

## 60-second elevator version

> We built an agentic self-healing layer for UI tests. When a locator breaks, an agent observes the DOM, proposes candidates, validates them live, and retries — Playwright, Cypress, Selenium. Local agent needs no server; cloud service adds LLM. On top, autonomous tests run from goals and reuse the same healing brain.
