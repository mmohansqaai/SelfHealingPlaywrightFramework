# autonomous-qa-sdk

Goal-driven autonomous testing and closed-loop maintenance for Playwright — built on top of **[ai-healing-sdk](../ai-healing-sdk)**.

Use **ai-healing-sdk** alone when you only need self-healing locators (plug-and-play).  
Use **autonomous-qa-sdk** when you want natural-language journeys, suite KPIs, maintenance tickets, and Jira/PR automation.

## Install

```bash
npm install ai-healing-sdk autonomous-qa-sdk
```

In this monorepo:

```json
{
  "dependencies": {
    "ai-healing-sdk": "file:../../packages/ai-healing-sdk",
    "autonomous-qa-sdk": "file:../../packages/autonomous-qa-sdk"
  }
}
```

## Minimal example

```typescript
import { enableHealing } from 'ai-healing-sdk';
import { runAutonomousTest, attachAutonomousTrace } from 'autonomous-qa-sdk';

test('login from goal', async ({ page }, testInfo) => {
  enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });
  const result = await runAutonomousTest(page, {
    goal: 'Log in with test@demo.com / password123',
    startUrl: '/login',
    maxSteps: 25,
    allowedDomains: ['vercel.app'],
  });
  await attachAutonomousTrace(testInfo, result);
  expect(result.status).toBe('completed');
});
```

See [`examples/nova-retail-qa`](../../examples/nova-retail-qa) for the full Nova Retail suite.
