# Speaker Notes — Agentic Healing Technical Presentation

**Deck file:** `docs/Agentic-Healing-Technical-Presentation.pptx`  
**Regenerate:** `npm run deck:agentic`

---

## Slide 1 — Title

Open with the problem: locator drift breaks Playwright tests. This framework auto-recovers using an agent loop — not magic, not always ChatGPT.

---

## Slide 2 — Agenda

Set expectation: we will be honest about what is and is not "pure AI."

---

## Slide 3 — Executive Summary

- Plug-and-play npm package (`ai-healing-sdk`)
- Agent loop with optional LLM on sidecar
- Works without API key in default mode
- Nova Retail is the reference app

---

## Slide 4 — Is This Pure Agentic AI?

**Key talking point:** Architecture is agentic (loop, tools, reflect). Real LLM is optional.

- In-process = heuristic tools, no API call
- Service + mock = agent shape, simulated LLM
- Service + OpenAI/Anthropic = real agentic AI

---

## Slide 5 — Agentic Maturity Table

Walk through each row. Emphasize: **same test code**, different env.

---

## Slide 6 — End-to-End Flow

Static locators always first (fast, free). Agent only after failure.

---

## Slide 7 — Monorepo Architecture

SDK is what consumers install. Monorepo is reference + optional gateway.

---

## Slide 8 — Agent Loop

Explain OBSERVE → REASON → ACT → REFLECT with iteration cap of 3.

---

## Slide 9 — Agent Tools

Tools gather context. LLM proposes; browser validates. Never trust LLM without count() check.

---

## Slide 10 — LLM Provider

API keys on service only. Mock for CI. OpenAI/Anthropic for production experiments.

---

## Slide 11 — Remote Healing Path

Live demo option: start `npm run healing-service`, run test with `HEALING_SERVICE_URL`.

---

## Slide 12 — Three Tiers

Tier 1 = start here. Tier 3 = add when you want real LLM.

---

## Slide 13 — Tier 1 How-To

Live code: `enableHealing` + `healable.click`. Run with `AUTO_HEAL_DISCOVER=1`.

---

## Slide 14 — Tier 2/3 How-To

Two terminals. Keys on service terminal only.

---

## Slide 15 — Page Object API

For teams already using page objects — `clickHealing` with strategy arrays.

---

## Slide 16 — Environment Variables

Quick reference for Q&A.

---

## Slide 17 — Reporting

Playwright = engineer debug. Dashboard = leadership metrics.

---

## Slide 18 — Governance

Healing ≠ fixing wrong assertions. discussOnly in demos.

---

## Slide 19 — Commands

`npm run test:llm-agent` for quick verification without browser.

---

## Slide 20 — Roadmap Delivered (Phases 8–11)

Highlight that autonomous login, checkout, governance, and maintenance are **shipped** — not future work.

---

## Slide 21 — Autonomous Phases Table

Quick reference: Phase 8 login MVP → Phase 11 maintenance + Jira.

---

## Slide 22 — Phase 8–11 Demo Commands

Live demo path: `test:autonomous-login` → `test:autonomous-checkout` → CI smoke with `MAINTENANCE_AGENT=1`.

Optional: show Jira ticket if `MAINTENANCE_PUBLISH_JIRA=1` is configured.

---

## Slide 23 — Future Enhancements

Vision agent, SaaS, npm publish — what comes after Phases 8–11.

---

## Slide 24 — Thank You

Offer live demo: `npm run test:autonomous-login` or `npm run test:healing-showcases -- --headed`.
Regenerate deck: `npm run deck:agentic`.
