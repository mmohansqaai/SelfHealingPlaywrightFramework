# How to Use — Agentic Self-Healing Playwright Framework

A practical guide to add self-healing to Playwright tests using `ai-healing-sdk`.

**Related docs**

| Document | When to read |
|----------|----------------|
| [agentic-healing-setup.md](./agentic-healing-setup.md) | LLM / OpenAI / Anthropic service configuration |
| [PRD-Agentic-AI-Conversion.md](./PRD-Agentic-AI-Conversion.md) | Architecture and roadmap |
| [Agentic-Healing-Technical-Presentation-Speaker-Notes.md](./Agentic-Healing-Technical-Presentation-Speaker-Notes.md) | Presentation talking points |
| [packages/ai-healing-sdk/README.md](../packages/ai-healing-sdk/README.md) | SDK API quick reference |

---

## 1. What this does (30 seconds)

When a Playwright locator fails (button moved, label changed, ID updated), the framework:

1. Tries your **original locator** first.
2. If that fails, runs an **agent loop** to find and validate a new locator.
3. Retries the action with the healed locator.

You change very little in your tests. Healing is opt-in via config or environment variables.

**Important:** This is **agentic by architecture** (loop + tools + reflection). **Real LLM (ChatGPT/Claude)** is optional and only used when you run `healing-service` with an API key. The default in-process mode works **without any API key**.

---

## 2. Choose your setup (3 tiers)

| Tier | What you need | Server? | API key? | Best for |
|------|----------------|---------|----------|----------|
| **1 — SDK only** | `ai-healing-sdk` | No | No | Getting started, CI, local dev |
| **2 — Remote service** | SDK + `healing-service` | Yes | No | Shared healing gateway, teams |
| **3 — LLM service** | SDK + `healing-service` + OpenAI/Anthropic | Yes | Yes (on service) | Hard UI failures, real AI |

**Same test code for all tiers** — only environment variables change.

---

## 3. Prerequisites

- **Node.js** 20+
- **npm** 9+
- **Playwright** installed in your project

```bash
npm install @playwright/test
npx playwright install chromium
```

---

## 4. Tier 1 — SDK only (recommended start)

Use this in **any Playwright project**. No monorepo, no server, no API key.

### Step 1: Install the SDK

```bash
npm install ai-healing-sdk @playwright/test
```

**From this monorepo (local path):**

```bash
npm install ./packages/ai-healing-sdk
```

### Step 2: Enable healing in your test

```ts
import { test } from '@playwright/test';
import { enableHealing, healable } from 'ai-healing-sdk';

test.beforeEach(async ({ page }) => {
  enableHealing(page, {
    healingEnabled: true,
    agentMode: 'agentic',
  });
});

test('customer login', async ({ page }) => {
  await page.goto('https://retail-website-two.vercel.app/login');

  await healable.fill(page.getByLabel(/email/i), 'test@demo.com');
  await healable.fill(page.getByLabel(/password/i), 'password123');
  await healable.click(page.getByRole('button', { name: /sign in/i }));
});
```

### Step 3: Turn on auto-heal when running tests

```bash
export AUTO_HEAL_DISCOVER=1
npx playwright test
```

### What changed in your code?

| Before | After |
|--------|-------|
| `await locator.click()` | `await healable.click(locator)` |
| `await locator.fill(value)` | `await healable.fill(locator, value)` |
| — | `enableHealing(page, …)` once per test or in `beforeEach` |

That is the minimum integration.

---

## 5. Tier 2 — Remote healing-service

Use when you want healing logic on a **separate service** (shared across projects or machines).

### Terminal 1 — start the service

From this monorepo root:

```bash
npm run healing-service
```

Service listens on `http://localhost:3921` (default).

### Terminal 2 — run tests

```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
export HEALING_AGENT_MODE=agentic
npx playwright test
```

Your test code stays the same as Tier 1 (`enableHealing` + `healable.*`).

### Optional: mock LLM on the service (still no API key)

```bash
# Terminal 1
export HEALING_LLM_PROVIDER=mock
npm run healing-service
```

---

## 6. Tier 3 — Real LLM (OpenAI or Anthropic)

API keys go on the **service only** — never in your Playwright test project.

### OpenAI

```bash
# Terminal 1
export HEALING_LLM_PROVIDER=openai
export HEALING_LLM_API_KEY=sk-your-key-here
export HEALING_LLM_MODEL=gpt-4o-mini   # optional
npm run healing-service
```

### Anthropic

```bash
# Terminal 1
export HEALING_LLM_PROVIDER=anthropic
export HEALING_LLM_API_KEY=sk-ant-your-key-here
export HEALING_LLM_MODEL=claude-3-5-haiku-20241022   # optional
npm run healing-service
```

### Terminal 2 (same for both)

```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
export HEALING_AGENT_MODE=agentic
npx playwright test
```

See [agentic-healing-setup.md](./agentic-healing-setup.md) for full LLM env reference.

---

## 7. Page objects (strategy chains)

If you already use page objects with explicit fallback locators:

```ts
import { clickHealing, fillHealing, type LocatorStrategy } from 'ai-healing-sdk';

const emailStrategies: LocatorStrategy[] = [
  { name: 'label-email', resolve: (p) => p.getByLabel(/email/i) },
  { name: 'css-email', resolve: (p) => p.locator('input[type="email"]').first() },
];

await fillHealing(page, emailStrategies, 'test@demo.com', {
  autoHeal: { enabled: true, agentMode: 'agentic' },
});

await clickHealing(page, [
  { name: 'btn-signin', resolve: (p) => p.getByRole('button', { name: /sign in/i }) },
], { autoHeal: { enabled: true } });
```

**Order matters:** static strategies run first; the agent loop runs only after all of them fail.

This is how `pages/login.page.ts` and other Nova Retail page objects work in this repo.

---

## 8. Attach healing details to HTML report

```ts
import { attachHealingSummary, healable } from 'ai-healing-sdk';

test('login with report', async ({ page }, testInfo) => {
  enableHealing(page, { healingEnabled: true });

  const result = await healable.click(page.getByRole('button', { name: /sign in/i }));
  await attachHealingSummary(testInfo, 'sign-in-click', result);
});
```

Open the report after the run:

```bash
npx playwright show-report
```

Look for attachments named `*-healing` with the winning strategy and all attempts.

---

## 9. Use in this monorepo (Nova Retail)

### Install and run

```bash
git clone <repo-url>
cd SelfHealingPlaywrightFramework
npm install
npm run install:browsers
```

### Run tests without healing (default)

```bash
npm test
```

Uses static locator chains in page objects only.

### Run with agentic healing

```bash
AUTO_HEAL_DISCOVER=1 npm test
```

### Run plug-and-play demo (external consumer pattern)

```bash
npm run test:plug-and-play
```

### Run healing showcases

```bash
npm run test:healing-showcases
```

### Run LLM agent unit tests (no browser)

```bash
npm run test:llm-agent
```

---

## 10. Environment variables (cheat sheet)

### SDK / test runner

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUTO_HEAL_DISCOVER` | `off` | Set to `1` to enable healing after static locator failure |
| `HEALING_AGENT_MODE` | `agentic` | `agentic` \| `legacy` \| `off` |
| `HEALING_AGENT_MAX_ITERATIONS` | `3` | Max agent reflect loops |
| `HEALING_SERVICE_URL` | — | e.g. `http://localhost:3921` for remote service |
| `AUTO_HEAL_DOM_SCAN` | on | Set to `0` to disable DOM scan in legacy mode |
| `AUTO_HEAL_STRATEGIES` | `seed,dom-scan` | Discovery strategies in legacy path |
| `AUTO_HEAL_PERSIST` | `off` | Set to `1` to write healed locators back to page objects |
| `AUTO_HEAL_VERBOSE` | `off` | Verbose healing logs |

### healing-service only (not in tests)

| Variable | Default | Purpose |
|----------|---------|---------|
| `HEALING_LLM_PROVIDER` | `mock` | `mock` \| `heuristic` \| `openai` \| `anthropic` |
| `HEALING_LLM_API_KEY` | — | Required for OpenAI/Anthropic |
| `HEALING_LLM_MODEL` | provider default | Model override |
| `HEALING_SERVICE_PORT` | `3921` | Service port |

---

## 11. `enableHealing` options

```ts
enableHealing(page, {
  healingEnabled: true,       // master switch (or use AUTO_HEAL_DISCOVER=1)
  agentMode: 'agentic',       // 'agentic' | 'legacy' | 'off'
  maxAgentIterations: 3,
  confidenceThreshold: 0.7,   // min confidence for persistence
  persistenceEnabled: false,  // auto-write healed locators to disk
  telemetryEnabled: true,
  verboseLogs: false,
  healingServiceUrl: 'http://localhost:3921', // optional override
});
```

---

## 12. How healing behaves (flow)

```
Your locator (static)
        │
        ▼
     Success? ──yes──► Test continues
        │
        no
        ▼
  Healing enabled?
        │
        no ──► Test fails (normal Playwright error)
        │
        yes
        ▼
  Agent loop (up to 3 iterations)
    • Capture DOM + failure hints
    • Run tools (heuristics, optional LLM on service)
    • Propose new locators
    • Validate in browser (count + retry action)
    • Reflect on failure → next iteration
        │
        ▼
  Healed? ──yes──► Test continues + report attachment
        │
        no ──► Test fails with agent exhaustion error
```

---

## 13. What is / is not healed

| Healed | Not healed |
|--------|----------------|
| Broken CSS selector | Wrong expected URL or title |
| Changed button label / role | Incorrect assertion value |
| Moved input field | Business logic bugs |
| Missing `data-testid` (if alternative found) | Test data / API failures |

Healing fixes **locators**, not **test intent**.

---

## 14. Troubleshooting

### Healing never runs

- Confirm `AUTO_HEAL_DISCOVER=1` or `healingEnabled: true`.
- Confirm you use `healable.click` / `healable.fill` (not raw `locator.click`).
- Static locator might still be passing — healing only runs after failure.

### `fetch failed` to healing-service

- Start the service: `npm run healing-service`.
- Set `HEALING_SERVICE_URL=http://localhost:3921`.
- Or use Tier 1 (no service) and unset `HEALING_SERVICE_URL`.

### LLM errors

- Set `HEALING_LLM_API_KEY` on the **service** terminal, not the test terminal.
- Try `HEALING_LLM_PROVIDER=mock` first to verify the path works.
- Use `HEALING_LLM_PROVIDER=heuristic` to disable LLM and use rules only.

### Tests pass but wrong element clicked

- Lower risk: use static strategy chains with specific locators first.
- Enable `discoverOnly: true` in demos until you trust heal quality.
- Review `attachHealingSummary` output in the HTML report.

### Want old behavior (no agent loop)

```bash
export HEALING_AGENT_MODE=legacy
```

---

## 15. Quick copy-paste recipes

### Recipe A — New project, minimal

```bash
npm install ai-healing-sdk @playwright/test
```

```ts
enableHealing(page, { healingEnabled: true });
await healable.click(page.getByRole('button', { name: 'Submit' }));
```

```bash
AUTO_HEAL_DISCOVER=1 npx playwright test
```

### Recipe B — This monorepo + healing

```bash
AUTO_HEAL_DISCOVER=1 npm test
```

### Recipe C — Service + mock LLM

```bash
# Terminal 1
HEALING_LLM_PROVIDER=mock npm run healing-service

# Terminal 2
HEALING_SERVICE_URL=http://localhost:3921 AUTO_HEAL_DISCOVER=1 npm test
```

### Recipe D — Service + OpenAI

```bash
# Terminal 1
HEALING_LLM_PROVIDER=openai HEALING_LLM_API_KEY=sk-... npm run healing-service

# Terminal 2
HEALING_SERVICE_URL=http://localhost:3921 AUTO_HEAL_DISCOVER=1 npm test
```

---

## 16. Next steps

1. Start with **Tier 1** in your project (`healable` + `AUTO_HEAL_DISCOVER=1`).
2. Add **HTML report attachments** for visibility.
3. Move to **Tier 2/3** when you need a shared service or real LLM.
4. Read the technical deck: `docs/Agentic-Healing-Technical-Presentation.pptx` (generate with `npm run deck:agentic`).
5. Roadmap to **fully autonomous AI agent**: [PRD-Fully-Autonomous-AI-Agent.md](./PRD-Fully-Autonomous-AI-Agent.md).

---

*Last updated: 2026-06-12*
