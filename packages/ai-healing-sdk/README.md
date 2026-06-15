# ai-healing-sdk

Plug-and-play **agentic** self-healing for Playwright tests.

**Full guide:** [docs/How-To-Use-Agentic-Healing.md](../../docs/How-To-Use-Agentic-Healing.md)

## Install

```bash
npm install ai-healing-sdk @playwright/test
```

## Quick start (pure agentic, in-process)

```ts
import { test } from '@playwright/test';
import { enableHealing, healable } from 'ai-healing-sdk';

test('login with agentic healing', async ({ page }) => {
  enableHealing(page, {
    healingEnabled: true,
    agentMode: 'agentic', // default when healing is enabled
  });

  await page.goto('https://your-app.com/login');
  await healable.fill(page.getByLabel(/email/i), 'user@example.com');
  await healable.click(page.getByRole('button', { name: /sign in/i }));
});
```

When a locator fails, the SDK runs an **observe → tool use → validate → reflect** agent loop (no LLM API key required by default).

## Remote agentic healing-service (optional)

```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
export HEALING_LLM_PROVIDER=mock   # or openai | anthropic on the service
npm run healing-service            # from monorepo root
```

LLM API keys are configured on **healing-service only** — not in your Playwright project. See `docs/agentic-healing-setup.md`.

## Legacy rule-only mode

```bash
export HEALING_AGENT_MODE=legacy
```

## Strategy-based API (page objects)

```ts
import { clickHealing, type LocatorStrategy } from 'ai-healing-sdk';

const strategies: LocatorStrategy[] = [
  { name: 'primary', resolve: (p) => p.getByRole('button', { name: /submit/i }) },
];

await clickHealing(page, strategies, { autoHeal: { enabled: true } });
```
