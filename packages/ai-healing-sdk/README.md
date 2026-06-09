# ai-healing-sdk

Plug-and-play self-healing for Playwright tests.

## Install

```bash
npm install ai-healing-sdk @playwright/test
```

Local monorepo path:

```bash
npm install ../path/to/packages/ai-healing-sdk
```

## Quick start

```ts
import { test } from '@playwright/test';
import { enableHealing, healable } from 'ai-healing-sdk';

test('login with healing', async ({ page }) => {
  enableHealing(page, { healingEnabled: true });

  await page.goto('https://your-app.com/login');
  await healable.fill(page.getByLabel(/email/i), 'user@example.com');
  await healable.click(page.getByRole('button', { name: /sign in/i }));
});
```

## Remote healing-service (optional)

```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
```

## Strategy-based API (page objects)

```ts
import { clickHealing, type LocatorStrategy } from 'ai-healing-sdk';

const strategies: LocatorStrategy[] = [
  { name: 'primary', resolve: (p) => p.getByRole('button', { name: /submit/i }) },
];

await clickHealing(page, strategies, { autoHeal: { enabled: true } });
```
