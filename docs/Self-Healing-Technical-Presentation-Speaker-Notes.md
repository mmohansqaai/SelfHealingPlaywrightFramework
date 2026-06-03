# Self-Healing Playwright Framework — Technical Presentation Speaker Notes

**Deck file:** `docs/Self-Healing-Technical-Presentation.pptx`  
**Flow diagram:** `docs/Self-Healing-Framework-Flow-Diagram.svg` (purple/pink gradient, dark text)  
**Generate deck:** `npm run deck:technical`  
**Suggested duration:** 25–35 minutes (plus 5–10 min live demo optional)

---

## Slide 1 — Title

**On screen:** Self-Healing Playwright Framework — tech stack, architecture, three strategies, dashboard.

**Say:**

> “Today I’ll walk through our Self-Healing Playwright Framework for Nova Retail. I’ll cover the technology stack, how the framework is architected, all three healing strategies and when each applies, and how results flow into our Real-Time Testing Dashboard so leadership and engineering share one view of quality.”

---

## Slide 2 — Agenda

**Say:**

> “We’ll start with stack and architecture, then go deep on each healing strategy—static, seed-based discovery, and DOM scan. I’ll show how they compose in the engine, how CI and Playwright reporting work, and how the dashboard ingests runs. We’ll close with governance—how we avoid false positives—and pointers to live demos you can run.”

---

## Slide 3 — Technology Stack

**Say:**

> “On the left: the application under test is Nova Retail, a Vercel-hosted SPA. We drive it with Playwright Test 1.51 and TypeScript 5.7, typically Chromium in CI. Tests use the Page Object Model—Login, Retail Journey, Admin Inventory—so specs stay readable.”

> “On the right: GitHub Actions runs the suite on Ubuntu. Playwright emits three outputs that matter: console list, HTML report for engineers, and JSON at `playwright-report/results.json` for automation. Videos are on for demo and debug. The Real-Time Testing Dashboard has an API on Render and a UI on Vercel; CI posts results there after each run.”

> “Everything is configured through `playwright.config.ts`, workflow env vars, and optional `AUTO_HEAL_*` flags.”

---

## Slide 4 — High-Level Architecture

**Say:**

> “The architecture is deliberately layered. Tests express business intent. Page objects own locators and call healing helpers—`clickHealing`, `fillHealing`, `expectVisibleHealing`. Those delegate to `withHealingPage`, the engine.”

> “The engine always tries human-authored static strategies first. Only if those fail and auto-heal is enabled do we run discovery—seed rules, DOM scan, or both—composed and de-duplicated by score. Every step produces a `HealingResult`: which strategy won and every attempt that failed. That metadata goes to the HTML report and, indirectly, to the dashboard via test pass/fail and names.”

---

## Slide 5 — Request Flow (diagram)

**Say:**

> “Walk through one click—Add to cart. The spec calls the page object. The page object calls `clickHealing` with an ordered strategy array. `withHealingPage` loops strategies until one succeeds.”

> “If all fail and auto-heal is on, we call the composed discoverer: seed plus DOM scan by default. Each candidate is validated on the live page with `count()`. We pick the highest score, perform the click, and return metadata.”

> “The test may attach a healing summary to the Playwright report. In CI, when the run finishes, `results.json` is transformed into a dashboard payload and zipped with the HTML report for multipart ingest. That’s the full vertical slice.”

---

## Slide 6 — Framework Design Principles

**Say:**

> “Five principles govern the design.”

> “One: static fallbacks first—fast, predictable, code-reviewed.”  
> “Two: auto-discovery is a safety net, not a replacement for assertions—we still assert URL, headings, order confirmed.”  
> “Three: discovery is pluggable—seed and DOM scan live in separate modules under `core/discovery/`.”  
> “Four: transparency—every attempt is logged; no silent magic.”  
> “Five: demos use `discoverOnly` so we don’t auto-commit locators without governance.”

---

## Slide 7 — Repository Structure

**Say:**

> “If you open the repo, `core/self-healing.ts` is the engine. `healing-types.ts` defines contracts. `locator-query.ts` turns generated queries into Playwright locators.”

> “Strategy 2 is `seed-discovery.ts`. Strategy 3 is `dom-scan-discovery.ts`. `compose-discoverers.ts` wires them together and reads env vars. `healing-reporter.ts` attaches evidence to the HTML report. `auto-heal-persistence.ts` can append a winning strategy into a page object file when explicitly enabled and confidence is high—that’s optional and gated.”

---

## Slide 8 — Strategy 1: Static Healing

**Say:**

> “Strategy 1 is what most teams already know: an ordered list of locators per element. For email we might try getByLabel, then a CSS for input type email, then the first textbox. We try in order; first success wins.”

> “For static-only mode we set `autoHeal.enabled: false`. No discovery runs.”

> “Our static showcase uses a deliberate broken selector—`data-demo-static-miss-add`—that doesn’t exist on the page, then the real static chain heals the click. The on-screen badge is blue: STATIC HEALING. This is what we want for production CI when we need deterministic, reviewable behavior.”

**Demo hook (optional):** `npm run test:static-healing-showcase -- --headed`

---

## Slide 9 — Strategy 2: Seed-Rule Discovery

**Say:**

> “Strategy 2 kicks in after static strategies fail. It inspects failure context—strategy names and error messages—and infers intent: email, password, add to cart, checkout, pay.”

> “It generates targeted candidates—like getByRole button name Add to cart—and probes the live DOM with `count()`. Scoring adds points for uniqueness—one match is better than many—and for history in `.self-healing-history.json` if we’ve succeeded with that locator before on this path.”

> “The dynamic showcase runs seed only—DOM scan off—so the narrative is clearly Strategy 2. Purple badge: DYNAMIC HEALING, SEED RULES. It’s faster than scanning the whole page because it doesn’t inventory every button.”

**Demo hook:** `npm run test:auto-heal-discovery-showcase -- --headed`

---

## Slide 10 — Strategy 3: DOM Scan Discovery

**Say:**

> “Strategy 3 is for when hints aren’t enough or the page changed broadly. We run JavaScript in the browser to list visible interactive elements—buttons, inputs, headings—up to eighty nodes.”

> “For each element we synthesize locators: data-testid, id, role plus accessible name, name and placeholder attributes. We boost score when labels align with intent from the failure—e.g. Add to cart.”

> “We validate each candidate on the live page again. Winners are named `domscan-*` so you can see in the report that DOM scan healed the step.”

> “The green-badge showcase runs DOM scan only—no seed rules—on the Products page after login, same toast pattern as the other demos.”

**Demo hook:** `npm run test:dom-scan-healing-showcase -- --headed`

---

## Slide 11 — How the Three Strategies Interact

**Say:**

> “At runtime the order is fixed: static always first. Then, if auto-heal is enabled, discovery runs. Default discovery is seed then DOM scan; the composer merges candidates by query key and keeps the highest score.”

> “You can configure per test: seed only, dom-scan only, or both. Environment variables `AUTO_HEAL_STRATEGIES` and `AUTO_HEAL_DOM_SCAN=0` let CI tune cost versus coverage.”

> “Our three showcase tests each isolate one discovery mode for teaching; production nightly might use both.”

---

## Slide 12 — Page Object Pattern

**Say:**

> “Page objects keep tests clean. `RetailJourneyPage.completeCheckoutAfterLogin` chains products, add to cart, cart, checkout, pay, confirm—each step returns a `HealingResult` so we can attach summaries.”

> “Strategy methods like `emailStrategies()` carry `source` metadata—file, method, action key—for optional persistence and for debugging which chain owned the element.”

---

## Slide 13 — Demonstration Tests (Beyond Login)

**Say:**

> “All three showcases follow the same UX pattern: login silently—no toasts on the login screen—then navigate to Products, show the mode badge, explain intent, show the broken locator, run healing, show outcome, go to cart.”

> “That’s intentional for video and executive demos: the audience sees the catalog, not a login form stuck on screen.”

> “CI runs all three tags in one grep so every strategy stays green on main.”

---

## Slide 14 — CI Pipeline

**Say:**

> “GitHub Actions installs dependencies and Chromium, runs the three showcase tests, uploads the HTML report and a zip of test-results for traces and video.”

> “A separate always-run step publishes to the dashboard: warm the Render API with a health GET, build `payload.json` from `results.json`, zip `playwright-report`, POST multipart to `run-with-report` with the ingest token. Ingest is non-blocking—if the API is cold or returns 502, the workflow still reflects test success or failure from Playwright.”

---

## Slide 15 — Dashboard Ingest Data Flow

**Say:**

> “After tests finish, `build-dashboard-payload.mjs` maps each Playwright test to a row: name, module, PASSED or FAILED, duration in milliseconds, plus suite name, environment CI, and git SHA as build version.”

> “The same run ships `report.zip` so the dashboard can embed the HTML report when ingest succeeds—check `has_html_report_zip` in the API response or `GET /api/summary`.”

> “Engineers drill into Playwright for healing attachments; managers use the dashboard for trends across builds.”

---

## Slide 16 — Dashboard vs Playwright Report

**Say:**

> “The dashboard answers: ‘Did the suite pass? How long? What’s the trend?’ It’s portfolio-level. Playwright answers: ‘Why did this step fail or heal? What were all the attempts?’”

> “Healing attachments—`add-to-cart-healing`, `auto-heal-live-proof`—are only in the HTML report today. The dashboard sees pass/fail at test granularity. A future enhancement is KPI widgets for auto-healed steps aggregated from attachments or custom payload fields.”

---

## Slide 17 — Healing Metadata in Reports

**Say:**

> “Every healed step can attach plain text: used strategy, checkmarks per attempt, auto-heal block with selected candidate score and reason, and a list of runner-up candidates with JSON queries.”

> “Demo toasts on the application mirror that story for non-technical viewers. For audits, the Playwright report is the source of truth.”

---

## Slide 18 — Governance / False Positives

**Say:**

> “Self-heal must not create false confidence. We keep real assertions after healed actions—cart URL, order confirmed text. We prefer static chains on critical paths. Showcases use discoverOnly.”

> “Scoring penalizes ambiguous matches—many elements for one selector. Roadmap includes post-action verification callbacks and refusing to heal when top candidates tie.”

> “Operationally: if a test often shows `autogenerated: true`, we review and promote a static strategy.”

---

## Slide 19 — When to Use Which Strategy

**Say:**

> “Static only for production smoke and compliance. Add seed when labels change but page structure is familiar. Add DOM scan for staging, refactors, or unknown screens. Disable DOM scan in CI with an env flag if runtime or ambiguity is a concern.”

> “The rule of thumb: start with static; add automation only where flakiness proves the cost is worth it.”

---

## Slide 20 — Commands & Environment Variables

**Say:**

> “`npm run test:healing-showcases` runs all three demos. Individual npm scripts exist per tag. Regenerate this deck with `npm run deck:technical`.”

> “Key env vars: `AUTO_HEAL_DISCOVER`, `AUTO_HEAL_DOM_SCAN`, `AUTO_HEAL_STRATEGIES`, dashboard `DASHBOARD_URL` and `DASHBOARD_INGEST_TOKEN`. Full ingest contract is in `docs/dashboard-ingest.md`.”

---

## Slide 21 — Roadmap & Closing

**Say:**

> “Next we’re stabilizing dashboard hosting, adding flow checkpoints, healVerify after healed clicks, and dashboard metrics for heal rate. Persistence to page objects stays behind review.”

> “I’m happy to take questions—or we can run `npm run test:healing-showcases -- --headed` live.”

---

## Appendix A — Live demo script (5 minutes)

1. Run: `npm run test:healing-showcases -- --headed`
2. Narrate: login is silent; Products page shows badge and toasts.
3. Point out three tests in runner—static, seed, dom-scan tags.
4. Open `playwright-report` → show attachment `auto-heal-live-proof` or `*-healing`.
5. Optional: show GitHub Actions log lines `POST .../run-with-report` and payload summary.

---

## Appendix B — Anticipated questions

| Question | Short answer |
|----------|----------------|
| Does healing fix broken product logic? | No—only locators. Assertions still fail if behavior is wrong. |
| Does it rewrite test code in CI? | Not by default (`discoverOnly`). `AUTO_HEAL_PERSIST=1` is opt-in. |
| Why three showcases? | One narrative per strategy for training and video. |
| Dashboard 502? | Render cold start/OOM; warm health check, retries, non-blocking ingest. |
| How is this different from Playwright codegen? | Runtime fallback chain + discovery, not record-time generation only. |

---

## Appendix C — Key URLs & files (reference)

| Item | Value |
|------|--------|
| App | `https://retail-website-fawn.vercel.app` |
| Dashboard API | `https://realtime-testing-dashboard-api-ld7t.onrender.com` |
| Ingest path | `POST /api/ingest/github-actions/run-with-report` |
| Engine | `core/self-healing.ts` |
| Discovery | `core/discovery/*.ts` |
| CI workflow | `.github/workflows/playwright.yml` |
