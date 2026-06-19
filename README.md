# agentic-platform (local monorepo)

**Single source of truth** for agentic test automation — develop here, publish slim slices to GitHub/npm.

| Layer | Packages |
|-------|----------|
| **Healing** | `ai-healing-core`, `ai-healing-agent`, `ai-healing-sdk`, `cypress`, `selenium`, `java` |
| **Autonomous QA** | `autonomous-qa-sdk`, `autonomous-test-agent` |
| **SaaS gateway** | `healing-service` (`POST /heal`, `POST /autonomous/plan`) |
| **Reference app** | `examples/nova-retail-qa` |

**GitHub (publish targets):**

| Repo | Command |
|------|---------|
| [agentic-platform](https://github.com/mmohansqaai/agentic-platform) (full) | `npm run publish:agentic-platform-github` |
| [agentic-healing-platform](https://github.com/mmohansqaai/agentic-healing-platform) (healing slice) | `npm run publish:healing-platform-github` |
| [ai-healing-sdk](https://github.com/mmohansqaai/ai-healing-sdk) (npm SDK slice) | `npm run publish:healing-sdk-github` |
| All slices | `npm run publish:all-slices-github` |

**Docs:** [UAT test plan & usage steps](docs/UAT-Test-Plan-and-Usage.md) · [CTO / AI Director brief](docs/CTO-AI-Director-Agentic-Healing-Brief.md) · [Setup](docs/agentic-healing-setup.md)

---

## Quick start

```bash
npm install
npm run build:healing-service
npm run healing-service              # http://localhost:3921

npm run test:plug-and-play           # minimal healing demo
npm run install:nova-retail-qa
npm run nova -- test:autonomous-login  # full autonomous
npm run test:unit
```

---

## Nova Retail reference app

Self-healing + autonomous tests for Nova Retail: `examples/nova-retail-qa/`

See [examples/nova-retail-qa/README.md](examples/nova-retail-qa/README.md) for traceability suite, maintenance scripts, and CI.

**Legacy root tests** (`tests/`, `pages/`) remain for unit tests and traceability; primary app lives under `examples/nova-retail-qa/`.

---

## Healing (how it works)

For each element we define an **ordered list** of locator strategies. On failure, the **agent loop** observes DOM, proposes candidates, validates, and retries.

- **Local agent** — `ai-healing-agent` (no server required)
- **Cloud agent** — `healing-service` + LLM (`HEALING_SERVICE_URL`)

See [docs/How-To-Use-Agentic-Healing.md](docs/How-To-Use-Agentic-Healing.md).

---

## Project structure

```
packages/          ← publishable modules (healing + autonomous)
agents/            ← locator, LLM, autonomous planner
services/          ← healing-service (SaaS API)
examples/          ← nova-retail-qa + plug-and-play
core/              ← legacy healing engine (used by demos)
docs/              ← setup, CTO brief, PRD
scripts/           ← extract + publish to GitHub slices
```

---

## CI

- `.github/workflows/playwright.yml` — main test CI
- `.github/workflows/autonomous-nightly.yml` — autonomous eval
- Published `agentic-platform` repo includes consolidated `ci.yml`

---

## Presentations

| Asset | Command |
|--------|---------|
| Agentic healing deck | `npm run deck:agentic` |
| Technical deck | `npm run deck:technical` |
| PM / executive deck | `npm run deck:pm` |
